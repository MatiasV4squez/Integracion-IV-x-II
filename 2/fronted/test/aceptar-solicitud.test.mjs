import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, aceptarSolicitud, crearBandejaSolicitudes, ErrorAceptarSolicitud, ErrorConsultaSesiones, SolicitudesRecibidasPage
const fetchOriginal = globalThis.fetch
const usuario = { token: 'token-de-prueba', idUsuario: '9007199254740993', roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const solicitud = {
  id_sesion: '9007199254740995', id_tutor: usuario.idUsuario, id_tutee: '15', id_materia: '3', id_bloque: '26',
  estado_sesion: 'PENDIENTE', inicio: '2026-10-24T18:00:00.000Z', fin: '2026-10-24T19:00:00.000Z',
  fecha_creacion: '2026-10-23T10:00:00.000Z', fecha_actualizacion: '2026-10-23T10:00:00.000Z', resultado_provisional: false,
}
const otra = { ...solicitud, id_sesion: '72' }
const confirmada = { ...solicitud, estado_sesion: 'CONFIRMADA' }
const diferida = () => {
  let resolver, rechazar
  const promesa = new Promise((resolve, reject) => { resolver = resolve; rechazar = reject })
  return { promesa, resolver, rechazar }
}
const avanzar = () => new Promise(setImmediate)

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ aceptarSolicitud } = await vite.ssrLoadModule('/src/features/sesiones/services/aceptar-solicitud-api.ts'))
  ;({ crearBandejaSolicitudes } = await vite.ssrLoadModule('/src/features/sesiones/aplicacion/bandeja-solicitudes.ts'))
  ;({ ErrorAceptarSolicitud, ErrorConsultaSesiones } = await vite.ssrLoadModule('/src/features/sesiones/models/error-sesiones.ts'))
  ;({ default: SolicitudesRecibidasPage } = await vite.ssrLoadModule('/src/features/sesiones/pages/SolicitudesRecibidasPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('acepta exclusivamente por Gateway con PATCH sin cuerpo, Bearer y el ID BIGINT intacto', async () => {
  let llamadas = 0
  globalThis.fetch = async (url, opciones) => {
    llamadas++
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/' + solicitud.id_sesion + '/accept')
    assert.equal(opciones.method, 'PATCH')
    assert.equal(opciones.body, undefined)
    assert.equal(opciones.headers.Authorization, 'Bearer ' + usuario.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    return Response.json({ ...confirmada, campoPrivado: 'no-exponer' })
  }
  assert.deepEqual(await aceptarSolicitud(solicitud.id_sesion, usuario), confirmada)
  assert.equal(llamadas, 1)
})

test('valida identidad, vencimiento, rol e identificador antes de enviar una aceptación', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar una solicitud inválida')
  for (const datos of [{ ...usuario, token: '' }, { ...usuario, expiraEn: 1 }, { ...usuario, idUsuario: '0' }]) {
    await assert.rejects(aceptarSolicitud(solicitud.id_sesion, datos), (error) => error.tipo === 'sesion')
  }
  await assert.rejects(aceptarSolicitud(solicitud.id_sesion, { ...usuario, roles: ['ESTUDIANTE'] }), (error) => error.tipo === 'permiso')
  for (const id of ['0', '-1', '1/accept', '1?otro=2', '9223372036854775808', 71]) {
    await assert.rejects(aceptarSolicitud(id, usuario), (error) => error.tipo === 'solicitud')
  }
})

test('distingue errores de acceso, solicitud ausente, conflicto y resultados inciertos sin reintentar PATCH', async () => {
  for (const [status, tipo] of [[400, 'solicitud'], [401, 'sesion'], [403, 'permiso'], [404, 'ausente'],
    [409, 'conflicto'], [500, 'incierto'], [502, 'incierto'], [503, 'incierto'], [504, 'incierto']]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle-privado', { status }) }
    await assert.rejects(aceptarSolicitud(solicitud.id_sesion, usuario), (error) => {
      assert.ok(error instanceof ErrorAceptarSolicitud)
      assert.equal(error.tipo, tipo)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
    assert.equal(llamadas, 1)
  }
})

test('no confirma respuestas malformadas, otra sesión, otro tutor ni un estado sin confirmar', async () => {
  for (const datos of [null, {}, { ...confirmada, id_sesion: '72' }, { ...confirmada, id_tutor: '99' }, solicitud,
    { ...confirmada, id_sesion: 71 }, { ...confirmada, fin: confirmada.inicio }, { ...confirmada, inicio: '2026-02-30T18:00:00Z' }]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(aceptarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
  }
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(aceptarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
})

test('cancela al salir y considera inciertos los fallos de red y timeout, sin reenviar la acción', async (t) => {
  const controlador = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const pendiente = aceptarSolicitud(solicitud.id_sesion, usuario, controlador.signal)
  controlador.abort()
  await assert.rejects(pendiente, { name: 'AbortError' })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(aceptarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => { opciones.signal.throwIfAborted() }
  await assert.rejects(aceptarSolicitud(solicitud.id_sesion, usuario), /pudo haberse aceptado/)
})

test('bloquea doble clic y recargas durante PATCH; elimina la fila solo tras confirmar y luego consulta GET', async () => {
  const escritura = diferida(), sincronizacion = diferida()
  let lecturas = 0, escrituras = 0
  const bandeja = crearBandejaSolicitudes({
    consultar: async () => ++lecturas === 1 ? [solicitud, otra] : sincronizacion.promesa,
    aceptar: async () => { escrituras++; return escritura.promesa },
  })
  await bandeja.iniciar()
  const accion = bandeja.aceptar(solicitud.id_sesion)
  await bandeja.aceptar(solicitud.id_sesion)
  await bandeja.aceptar(otra.id_sesion)
  await bandeja.recargar()
  assert.equal(escrituras, 1)
  assert.equal(lecturas, 1)
  assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'aceptando')
  assert.equal(bandeja.obtenerEstado().consulta.solicitudes.length, 2)
  escritura.resolver(confirmada)
  await avanzar()
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
  assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'aceptada')
  assert.equal(bandeja.obtenerEstado().actualizando, true)
  sincronizacion.resolver([otra])
  await accion
  assert.equal(lecturas, 2)
  assert.equal(bandeja.obtenerEstado().actualizando, false)
  bandeja.detener()
})

test('un fallo al refrescar no revierte una aceptación confirmada ni restaura su fila', async () => {
  let lecturas = 0
  const bandeja = crearBandejaSolicitudes({
    consultar: async () => { if (++lecturas === 1) return [solicitud, otra]; throw new ErrorConsultaSesiones('Sin conexión') },
    aceptar: async () => confirmada,
  })
  await bandeja.iniciar()
  await bandeja.aceptar(solicitud.id_sesion)
  assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'aceptada')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
  assert.equal(bandeja.obtenerEstado().errorActualizacion, 'Sin conexión')
  bandeja.detener()
})

test('reconcilia un resultado incierto antes de permitir otra aceptación y conserva la fila si no pudo consultar', async () => {
  let lecturas = 0, escrituras = 0
  const bandeja = crearBandejaSolicitudes({
    consultar: async () => { if (++lecturas === 2) throw new ErrorConsultaSesiones('Sin conexión'); return [solicitud] },
    aceptar: async () => { escrituras++; throw new ErrorAceptarSolicitud('Resultado incierto', 'incierto') },
  })
  await bandeja.iniciar()
  await bandeja.aceptar(solicitud.id_sesion)
  assert.equal(bandeja.obtenerEstado().necesitaActualizar, true)
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [solicitud])
  await bandeja.aceptar(solicitud.id_sesion)
  assert.equal(escrituras, 1)
  await bandeja.recargar()
  assert.equal(bandeja.obtenerEstado().necesitaActualizar, false)
  assert.equal(escrituras, 1)
  bandeja.detener()
})

test('reconcilia conflictos y solicitudes eliminadas sin simular éxito ni reenviar PATCH', async () => {
  for (const tipo of ['conflicto', 'ausente', 'incierto']) {
    let lecturas = 0, escrituras = 0
    const bandeja = crearBandejaSolicitudes({
      consultar: async () => ++lecturas === 1 ? [solicitud, otra] : [otra],
      aceptar: async () => { escrituras++; throw new ErrorAceptarSolicitud('No confirmada', tipo) },
    })
    await bandeja.iniciar()
    await bandeja.aceptar(solicitud.id_sesion)
    assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'error')
    assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
    assert.equal(lecturas, 2)
    assert.equal(escrituras, 1)
    bandeja.detener()
  }
})

test('401 y 403 detienen nuevas acciones y consultas automáticas hasta cambiar de sesión', async () => {
  for (const tipo of ['sesion', 'permiso']) {
    let lecturas = 0, escrituras = 0
    const bandeja = crearBandejaSolicitudes({
      consultar: async () => { lecturas++; return [solicitud] },
      aceptar: async () => { escrituras++; throw new ErrorAceptarSolicitud('Acceso denegado', tipo) },
    })
    await bandeja.iniciar()
    await bandeja.aceptar(solicitud.id_sesion)
    await bandeja.recargar()
    await bandeja.aceptar(solicitud.id_sesion)
    assert.equal(lecturas, 1)
    assert.equal(escrituras, 1)
    assert.equal(bandeja.obtenerEstado().aceptacion.tipo, tipo)
    bandeja.detener()
  }
})

test('una consulta anterior no reemplaza una más reciente y al desmontar se abortan las operaciones', async () => {
  const vieja = diferida(), nueva = diferida(), escritura = diferida()
  let lecturas = 0, signalVieja, signalEscritura
  const bandeja = crearBandejaSolicitudes({
    consultar: async (signal) => { if (++lecturas === 1) { signalVieja = signal; return vieja.promesa } return nueva.promesa },
    aceptar: async (_id, signal) => { signalEscritura = signal; return escritura.promesa },
  })
  const primera = bandeja.iniciar()
  const segunda = bandeja.recargar()
  assert.equal(signalVieja.aborted, true)
  nueva.resolver([solicitud])
  await segunda
  vieja.resolver([otra])
  await primera
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [solicitud])
  const accion = bandeja.aceptar(solicitud.id_sesion)
  bandeja.detener()
  assert.equal(signalEscritura.aborted, true)
  const detenido = bandeja.obtenerEstado()
  escritura.resolver(confirmada)
  await accion
  assert.equal(bandeja.obtenerEstado(), detenido)
})

const pagina = (props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SolicitudesRecibidasPage, {
  consulta: { estado: 'listo', solicitudes: [solicitud, otra] }, ahora: Date.parse('2026-10-23T12:00:00Z'),
  onRecargar() {}, onAceptar() {}, ...props,
})))

test('muestra acciones accesibles, bloquea envíos simultáneos y diferencia aceptación, error y refresco fallido', () => {
  assert.match(pagina(), />Aceptar solicitud<\/button>/)
  assert.match(pagina(), /data-etiqueta="Acciones"/)
  const esperando = pagina({ aceptacion: { estado: 'aceptando', idSesion: solicitud.id_sesion }, bloqueada: true })
  assert.match(esperando, /Aceptando…/)
  assert.match(esperando, /disabled="" aria-busy="true"/)
  assert.match(esperando, /disabled="" aria-busy="false"/)
  assert.match(pagina({ aceptacion: { estado: 'aceptada', idSesion: solicitud.id_sesion } }), /La tutoría está confirmada/)
  const error = pagina({ aceptacion: { estado: 'error', idSesion: solicitud.id_sesion, tipo: 'sesion', mensaje: 'Inicia sesión nuevamente' } })
  assert.match(error, /role="alert"/)
  assert.match(error, /href="\/login"/)
  assert.doesNotMatch(error, /La tutoría está confirmada/)
  assert.match(pagina({ errorActualizacion: 'Sin conexión' }), /últimos datos confirmados/)
  assert.match(pagina({ actualizando: true }), /Actualizando solicitudes/)
  assert.doesNotMatch(pagina(), /Rechazar solicitud/)
})
