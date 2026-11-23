import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, rechazarSolicitud, crearBandejaSolicitudes, ErrorRechazarSolicitud, ErrorConsultaSesiones, Page, Dashboard
const fetchOriginal = globalThis.fetch
const usuario = { token: 'token-de-prueba', idUsuario: '9007199254740993', roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const solicitud = {
  id_sesion: '9007199254740995', id_tutor: usuario.idUsuario, id_tutee: '15', id_materia: '3', id_bloque: '26',
  estado_sesion: 'PENDIENTE', inicio: '2026-12-24T18:00:00.000Z', fin: '2026-12-24T19:00:00.000Z',
  fecha_creacion: '2026-12-23T10:00:00.000Z', fecha_actualizacion: '2026-12-23T10:00:00.000Z', resultado_provisional: false,
}
const otra = { ...solicitud, id_sesion: '72' }
const rechazada = { ...solicitud, estado_sesion: 'RECHAZADA' }
const diferida = () => {
  let resolver
  const promesa = new Promise((resolve) => { resolver = resolve })
  return { promesa, resolver }
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ rechazarSolicitud } = await vite.ssrLoadModule('/src/features/sesiones/services/rechazar-solicitud-api.ts'))
  ;({ crearBandejaSolicitudes } = await vite.ssrLoadModule('/src/features/sesiones/aplicacion/bandeja-solicitudes.ts'))
  ;({ ErrorRechazarSolicitud, ErrorConsultaSesiones } = await vite.ssrLoadModule('/src/features/sesiones/models/error-sesiones.ts'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/sesiones/pages/SolicitudesRecibidasPage.tsx'))
  ;({ default: Dashboard } = await vite.ssrLoadModule('/src/features/panel-tutor/pages/DashboardTutorPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('rechaza por Gateway con PATCH sin cuerpo, Bearer e ID BIGINT, conservando solo el contrato público', async () => {
  let llamadas = 0
  globalThis.fetch = async (url, opciones) => {
    llamadas++
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/' + solicitud.id_sesion + '/reject')
    assert.equal(opciones.method, 'PATCH')
    assert.equal(opciones.body, undefined)
    assert.equal(opciones.headers.Authorization, 'Bearer ' + usuario.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    assert.ok(opciones.signal instanceof AbortSignal)
    return Response.json({ ...rechazada, campoPrivado: 'no-exponer' })
  }
  assert.deepEqual(await rechazarSolicitud(solicitud.id_sesion, usuario), rechazada)
  assert.equal(llamadas, 1)
})

test('no envía rechazos sin sesión vigente, rol TUTOR o identificadores válidos', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar una solicitud inválida')
  for (const datos of [{ ...usuario, token: '' }, { ...usuario, expiraEn: 1 }, { ...usuario, idUsuario: '0' }]) {
    await assert.rejects(rechazarSolicitud(solicitud.id_sesion, datos), (error) => error.tipo === 'sesion')
  }
  await assert.rejects(rechazarSolicitud(solicitud.id_sesion, { ...usuario, roles: ['ESTUDIANTE'] }), (error) => error.tipo === 'permiso')
  for (const id of ['0', '-1', '1/reject', '1?otro=2', '9223372036854775808', 71]) {
    await assert.rejects(rechazarSolicitud(id, usuario), (error) => error.tipo === 'solicitud')
  }
})

test('distingue errores HTTP sin exponer detalles internos ni repetir el rechazo', async () => {
  for (const [status, tipo] of [[400, 'solicitud'], [401, 'sesion'], [403, 'permiso'], [404, 'ausente'],
    [409, 'conflicto'], [500, 'incierto'], [502, 'incierto'], [503, 'incierto'], [504, 'incierto']]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle-privado', { status }) }
    await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario), (error) => {
      assert.ok(error instanceof ErrorRechazarSolicitud)
      assert.equal(error.tipo, tipo)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
    assert.equal(llamadas, 1)
  }
})

test('exige 200 y una sesión rechazada válida del mismo tutor y solicitud', async () => {
  for (const datos of [null, {}, solicitud, { ...rechazada, estado_sesion: 'CONFIRMADA' },
    { ...rechazada, id_sesion: '72' }, { ...rechazada, id_tutor: '99' }, { ...rechazada, id_sesion: 71 },
    { ...rechazada, fin: rechazada.inicio }, { ...rechazada, inicio: '2026-02-30T18:00:00Z' }]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
  }
  for (const respuesta of [new Response('no es JSON'), Response.json(rechazada, { status: 202 })]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
  }
})

test('aborta al salir y trata red o timeout como resultado incierto, sin reenviar PATCH', async (t) => {
  const controlador = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const pendiente = rechazarSolicitud(solicitud.id_sesion, usuario, controlador.signal)
  controlador.abort()
  await assert.rejects(pendiente, { name: 'AbortError' })
  globalThis.fetch = () => assert.fail('No debe enviar una petición cancelada')
  await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario, controlador.signal), { name: 'AbortError' })
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; throw new TypeError('Failed to fetch') }
  await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario), (error) => error.tipo === 'incierto')
  assert.equal(llamadas, 1)
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => opciones.signal.throwIfAborted()
  await assert.rejects(rechazarSolicitud(solicitud.id_sesion, usuario), /pudo haberse rechazado/)
})

test('aceptar y rechazar comparten el bloqueo frente a doble clic, decisiones opuestas y recargas', async () => {
  for (const primera of ['aceptar', 'rechazar']) {
    const escritura = diferida()
    let lecturas = 0, escrituras = 0
    const operar = async () => { escrituras++; return escritura.promesa }
    const bandeja = crearBandejaSolicitudes({ consultar: async () => ++lecturas === 1 ? [solicitud, otra] : [otra], aceptar: operar, rechazar: operar })
    await bandeja.iniciar()
    const pendiente = bandeja[primera](solicitud.id_sesion)
    await bandeja.aceptar(solicitud.id_sesion)
    await bandeja.rechazar(solicitud.id_sesion)
    await bandeja.rechazar(otra.id_sesion)
    await bandeja.recargar()
    assert.equal(escrituras, 1)
    assert.equal(lecturas, 1)
    assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [solicitud, otra])
    escritura.resolver(primera === 'aceptar' ? { ...solicitud, estado_sesion: 'CONFIRMADA' } : rechazada)
    await pendiente
    assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
    assert.equal(lecturas, 2)
    bandeja.detener()
  }
})

test('encadena PATCH y nueva consulta; un fallo del refresco conserva el rechazo confirmado y retira su fila', async () => {
  const lecturas = diferida(), orden = []
  globalThis.fetch = async (_url, opciones) => { orden.push(opciones.method); return Response.json(rechazada) }
  let primera = true
  const bandeja = crearBandejaSolicitudes({
    consultar: async () => { if (primera) { primera = false; return [solicitud, otra] } orden.push('GET'); return lecturas.promesa },
    aceptar: () => assert.fail('No debe aceptar'), rechazar: (id, signal) => rechazarSolicitud(id, usuario, signal),
  })
  await bandeja.iniciar()
  const pendiente = bandeja.rechazar(solicitud.id_sesion)
  await new Promise(setImmediate)
  assert.deepEqual(orden, ['PATCH', 'GET'])
  assert.equal(bandeja.obtenerEstado().rechazo.estado, 'rechazada')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
  lecturas.resolver(Promise.reject(new ErrorConsultaSesiones('Sin conexión')))
  await pendiente
  assert.equal(bandeja.obtenerEstado().rechazo.estado, 'rechazada')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
  assert.equal(bandeja.obtenerEstado().errorActualizacion, 'Sin conexión')
  bandeja.detener()
})

test('conflictos y solicitudes ausentes se reconcilian sin anunciar éxito; después puede aceptar otra solicitud', async () => {
  for (const tipo of ['conflicto', 'ausente', 'incierto']) {
    let lecturas = 0, escrituras = 0
    const bandeja = crearBandejaSolicitudes({
      consultar: async () => ++lecturas === 1 ? [solicitud, otra] : [otra],
      rechazar: async () => { escrituras++; throw new ErrorRechazarSolicitud('No confirmada', tipo) },
      aceptar: async () => ({ ...otra, estado_sesion: 'CONFIRMADA' }),
    })
    await bandeja.iniciar()
    await bandeja.rechazar(solicitud.id_sesion)
    assert.equal(bandeja.obtenerEstado().rechazo.estado, 'error')
    assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [otra])
    assert.equal(escrituras, 1)
    assert.equal(lecturas, 2)
    await bandeja.aceptar(otra.id_sesion)
    assert.equal(bandeja.obtenerEstado().rechazo.estado, 'inicial')
    assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'aceptada')
    bandeja.detener()
  }
})

test('un resultado incierto sin reconciliación bloquea ambas decisiones hasta actualizar', async () => {
  let lecturas = 0, rechazos = 0, aceptaciones = 0
  const bandeja = crearBandejaSolicitudes({
    consultar: async () => { if (++lecturas === 2) throw new ErrorConsultaSesiones('Sin conexión'); return [solicitud] },
    rechazar: async () => { rechazos++; throw new ErrorRechazarSolicitud('No confirmado', 'incierto') },
    aceptar: async () => { aceptaciones++; return { ...solicitud, estado_sesion: 'CONFIRMADA' } },
  })
  await bandeja.iniciar()
  await bandeja.rechazar(solicitud.id_sesion)
  await bandeja.rechazar(solicitud.id_sesion)
  await bandeja.aceptar(solicitud.id_sesion)
  assert.equal(bandeja.obtenerEstado().necesitaActualizar, true)
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [solicitud])
  assert.equal(rechazos, 1)
  assert.equal(aceptaciones, 0)
  await bandeja.recargar()
  assert.equal(bandeja.obtenerEstado().necesitaActualizar, false)
  bandeja.detener()
})

test('401 y 403 al rechazar detienen ambas decisiones y las consultas automáticas', async () => {
  for (const tipo of ['sesion', 'permiso']) {
    let lecturas = 0, escrituras = 0
    const bandeja = crearBandejaSolicitudes({
      consultar: async () => { lecturas++; return [solicitud] },
      rechazar: async () => { escrituras++; throw new ErrorRechazarSolicitud('Acceso denegado', tipo) },
      aceptar: () => assert.fail('No debe aceptar después de perder acceso'),
    })
    await bandeja.iniciar()
    await bandeja.rechazar(solicitud.id_sesion)
    await bandeja.rechazar(solicitud.id_sesion)
    await bandeja.aceptar(solicitud.id_sesion)
    await bandeja.recargar()
    assert.equal(lecturas, 1)
    assert.equal(escrituras, 1)
    bandeja.detener()
  }
})

test('al salir aborta el rechazo pendiente y descarta su respuesta tardía', async () => {
  const escritura = diferida()
  let signal
  const bandeja = crearBandejaSolicitudes({ consultar: async () => [solicitud], aceptar: () => assert.fail(),
    rechazar: (_id, externa) => { signal = externa; return escritura.promesa } })
  await bandeja.iniciar()
  const pendiente = bandeja.rechazar(solicitud.id_sesion)
  bandeja.detener()
  const detenido = bandeja.obtenerEstado()
  assert.equal(signal.aborted, true)
  escritura.resolver(rechazada)
  await pendiente
  assert.equal(bandeja.obtenerEstado(), detenido)
})

const pagina = (props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, {
  consulta: { estado: 'listo', solicitudes: [solicitud] }, ahora: 0, onRecargar() {}, onAceptar() {}, onRechazar() {}, ...props,
})))

test('la bandeja presenta ambas decisiones, bloquea los controles en curso y distingue éxito, acceso y refresco fallido', () => {
  assert.match(pagina(), />Rechazar solicitud<\/button>/)
  assert.match(pagina(), /aria-label="Rechazar solicitud #9007199254740995 de estudiante #15"/)
  const enCurso = pagina({ rechazo: { estado: 'rechazando', idSesion: solicitud.id_sesion } })
  assert.match(enCurso, /Rechazando…/)
  assert.equal((enCurso.match(/disabled=""/g) ?? []).length, 3, 'Actualizar, aceptar y rechazar bloqueados')
  const confirmada = pagina({ consulta: { estado: 'listo', solicitudes: [] }, rechazo: { estado: 'rechazada', idSesion: solicitud.id_sesion }, errorActualizacion: 'Sin conexión' })
  assert.match(confirmada, /rechazada\./)
  assert.match(confirmada, /últimos datos confirmados/)
  assert.doesNotMatch(confirmada, /Rechazar solicitud/)
  const error = pagina({ rechazo: { estado: 'error', idSesion: solicitud.id_sesion, tipo: 'sesion', mensaje: 'Acceso vencido' } })
  assert.match(error, /role="alert"/)
  assert.match(error, /href="\/login"/)
  assert.equal((error.match(/disabled=""/g) ?? []).length, 3)
  assert.doesNotMatch(error, /rechazada\./)
  assert.doesNotMatch(pagina({ acceso: 'permiso' }), /Rechazar solicitud|Aceptar solicitud/)
})

test('el panel del tutor reutiliza las acciones y los mensajes de rechazo', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Dashboard, {
    ahora: 0, materias: [], solicitudes: { estado: 'listo', solicitudes: [solicitud] },
    aceptacion: { estado: 'inicial' }, rechazo: { estado: 'rechazando', idSesion: solicitud.id_sesion },
    bloqueada: true, actualizando: false, proximas: [], completadas: 0, disponibilidad: { estado: 'listo', bloques: [] },
    onAceptar() {}, onRechazar() {}, onActualizar() {}, onRecargarDisponibilidad() {},
  })))
  assert.match(html, /Rechazando la solicitud/)
  assert.match(html, /aria-label="Rechazando solicitud/)
  assert.match(html, /disabled="" aria-busy="true"/)
  assert.doesNotMatch(html, /rechazada\./)
})
