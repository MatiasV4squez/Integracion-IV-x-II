import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, cancelarSesion, ErrorCancelarSesion, crearCancelacionSesiones, puedeCancelar, SesionesActivas, Detalle
let consultarSesionesActivas, consultarDetalleTutoria
const fetchOriginal = globalThis.fetch
const estudiante = { token: 'jwt-estudiante-prueba', idUsuario: '9007199254740993', roles: ['ESTUDIANTE'], expiraEn: Date.now() + 3600000 }
const tutor = { ...estudiante, token: 'jwt-tutor-prueba', idUsuario: '9007199254740995', roles: ['TUTOR'] }
const confirmada = {
  id_sesion: '9007199254740997', id_tutee: estudiante.idUsuario, id_tutor: tutor.idUsuario, id_materia: '3', id_bloque: '4',
  estado_sesion: 'CONFIRMADA', inicio: '2099-12-24T18:00:00.000Z', fin: '2099-12-24T19:00:00.000Z',
  fecha_creacion: '2099-12-23T10:00:00.000Z', fecha_actualizacion: '2099-12-23T10:00:00.000Z', resultado_provisional: false,
}
const cancelada = { ...confirmada, estado_sesion: 'CANCELADA' }
const otra = { ...confirmada, id_sesion: '72' }
const acciones = { aceptar: false, rechazar: false, cancelar: true, declarar_cierre: false, calificar: false, resolver_conflicto: false }
const detalle = { ...confirmada, calificaciones: [], declaraciones: [], acciones_disponibles: acciones,
  datos_encuentro: { modalidad: null, lugar: null, enlace: null } }
const diferida = () => {
  let resolver
  const promesa = new Promise((resolve) => { resolver = resolve })
  return { promesa, resolver }
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ cancelarSesion } = await vite.ssrLoadModule('/src/features/sesiones/services/cancelar-sesion-api.ts'))
  ;({ ErrorCancelarSesion } = await vite.ssrLoadModule('/src/features/sesiones/models/error-sesiones.ts'))
  ;({ crearCancelacionSesiones } = await vite.ssrLoadModule('/src/features/sesiones/aplicacion/cancelacion-sesiones.ts'))
  ;({ puedeCancelar } = await vite.ssrLoadModule('/src/features/sesiones/utils/sesiones-activas.ts'))
  ;({ SesionesActivas } = await vite.ssrLoadModule('/src/features/sesiones/components/SesionesActivas.tsx'))
  ;({ default: Detalle } = await vite.ssrLoadModule('/src/features/sesiones/pages/DetalleTutoriaPage.tsx'))
  ;({ consultarSesionesActivas } = await vite.ssrLoadModule('/src/features/sesiones/services/sesiones-api.ts'))
  ;({ consultarDetalleTutoria } = await vite.ssrLoadModule('/src/features/sesiones/services/tutorias-api.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('estudiante y tutor cancelan por Gateway con PATCH sin cuerpo y sus propios Bearer, sin convertir BIGINT', async () => {
  for (const usuario of [estudiante, tutor, { ...tutor, roles: ['ESTUDIANTE', 'TUTOR'] }]) {
    let llamadas = 0
    globalThis.fetch = async (url, opciones) => {
      llamadas++
      assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/' + confirmada.id_sesion + '/cancel')
      assert.equal(opciones.method, 'PATCH')
      assert.equal(opciones.body, undefined)
      assert.equal(opciones.headers.Authorization, 'Bearer ' + usuario.token)
      assert.equal(opciones.headers.Accept, 'application/json')
      return Response.json(cancelada)
    }
    await cancelarSesion(confirmada.id_sesion, usuario)
    assert.equal(llamadas, 1)
  }
})

test('no envía la cancelación con sesión, rol o identificador inválidos', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar datos inválidos')
  for (const usuario of [{ ...tutor, token: '' }, { ...tutor, idUsuario: '0' }, { ...tutor, expiraEn: 1 }]) {
    await assert.rejects(cancelarSesion(confirmada.id_sesion, usuario), (error) => error.tipo === 'sesion')
  }
  await assert.rejects(cancelarSesion(confirmada.id_sesion, { ...tutor, roles: ['ADMINISTRADOR'] }), (error) => error.tipo === 'permiso')
  for (const id of ['0', '-1', 71, '1/cancel', '1?otro=2', '9223372036854775808']) {
    await assert.rejects(cancelarSesion(id, tutor), (error) => error.tipo === 'solicitud')
  }
})

test('distingue errores HTTP, conserva mensajes públicos y nunca reintenta el PATCH', async () => {
  for (const [status, tipo] of [[400, 'solicitud'], [401, 'sesion'], [403, 'permiso'], [404, 'ausente'],
    [409, 'conflicto'], [500, 'incierto'], [502, 'incierto'], [503, 'incierto'], [504, 'incierto']]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle-privado', { status }) }
    await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor), (error) => {
      assert.ok(error instanceof ErrorCancelarSesion)
      assert.equal(error.tipo, tipo)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
    assert.equal(llamadas, 1)
  }
})

test('solo confirma 200 con estado CANCELADA, la misma sesión y la participación correspondiente al rol', async () => {
  for (const datos of [null, {}, confirmada, { ...cancelada, id_sesion: '72' },
    { ...cancelada, id_tutor: '99' }, { ...cancelada, fin: cancelada.inicio }]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor), (error) => error.tipo === 'incierto')
  }
  globalThis.fetch = async () => Response.json(cancelada)
  await assert.rejects(cancelarSesion(confirmada.id_sesion, { ...tutor, roles: ['ESTUDIANTE'] }), (error) => error.tipo === 'incierto')
  await assert.rejects(cancelarSesion(confirmada.id_sesion, { ...estudiante, roles: ['TUTOR'] }), (error) => error.tipo === 'incierto')
  for (const respuesta of [new Response('no es JSON'), Response.json(cancelada, { status: 202 })]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor), (error) => error.tipo === 'incierto')
  }
})

test('propaga la cancelación al salir y distingue resultados inciertos de red y timeout', async (t) => {
  const controlador = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const pendiente = cancelarSesion(confirmada.id_sesion, tutor, controlador.signal)
  controlador.abort()
  await assert.rejects(pendiente, { name: 'AbortError' })
  globalThis.fetch = () => assert.fail('No debe enviar una petición ya cancelada')
  await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor, controlador.signal), { name: 'AbortError' })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor), (error) => error.tipo === 'incierto')
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => opciones.signal.throwIfAborted()
  await assert.rejects(cancelarSesion(confirmada.id_sesion, tutor), /pudo haberse cancelado/)
})

test('permite a ambos participantes solo antes del inicio y conserva el retiro de pendientes exclusivo del estudiante', () => {
  const inicio = Date.parse(confirmada.inicio)
  for (const usuario of [estudiante.idUsuario, tutor.idUsuario]) {
    assert.equal(puedeCancelar(confirmada, usuario, inicio - 1), true)
    assert.equal(puedeCancelar(confirmada, usuario, inicio), false)
    assert.equal(puedeCancelar(confirmada, usuario, inicio + 1), false)
    for (const estado of ['RECHAZADA', 'CANCELADA', 'PENDIENTE_CIERRE', 'COMPLETADA', 'EN_CONFLICTO']) {
      assert.equal(puedeCancelar({ ...confirmada, estado_sesion: estado }, usuario, inicio - 1), false)
    }
  }
  assert.equal(puedeCancelar(confirmada, '99', inicio - 1), false)
  const pendiente = { ...confirmada, estado_sesion: 'PENDIENTE' }
  assert.equal(puedeCancelar(pendiente, estudiante.idUsuario, inicio), true)
  assert.equal(puedeCancelar(pendiente, tutor.idUsuario, inicio - 1), false)
})

function preparar(opciones = {}) {
  const operacion = crearCancelacionSesiones({ idUsuario: tutor.idUsuario, confirmar: () => true,
    cancelar: async () => {}, recargar() {}, ...opciones })
  operacion.iniciar()
  operacion.recibirConsulta({ estado: 'listo' })
  return operacion
}

test('necesita confirmación y descarta sesiones ajenas o que no pueden cancelarse', async () => {
  let confirmaciones = 0
  const operacion = preparar({ confirmar: () => { confirmaciones++; return false }, cancelar: () => assert.fail('No debe cancelar') })
  await operacion.cancelar({ ...confirmada, id_tutor: '99' })
  await operacion.cancelar({ ...confirmada, estado_sesion: 'CANCELADA' })
  await operacion.cancelar(confirmada)
  assert.equal(confirmaciones, 1)
  assert.equal(operacion.obtenerEstado().cancelando, null)
  operacion.detener()
})

test('comprueba otra vez el inicio al cerrar la confirmación y no envía un PATCH tardío', async (t) => {
  const inicio = Date.parse(confirmada.inicio)
  let ahora = inicio - 1, lecturas = 0
  t.mock.method(Date, 'now', () => ahora)
  const operacion = preparar({ confirmar: () => { ahora = inicio; return true },
    cancelar: () => assert.fail('La sesión ya comenzó'), recargar: () => lecturas++ })
  await operacion.cancelar(confirmada)
  assert.equal(operacion.obtenerEstado().error.tipo, 'conflicto')
  assert.deepEqual(operacion.obtenerEstado().canceladas, [])
  assert.equal(lecturas, 1)
  operacion.detener()
})

test('bloquea doble clic, otras cancelaciones y recargas mientras espera la respuesta', async () => {
  const escritura = diferida()
  let escrituras = 0, lecturas = 0
  const operacion = preparar({ cancelar: async () => { escrituras++; return escritura.promesa }, recargar: () => lecturas++ })
  const pendiente = operacion.cancelar(confirmada)
  await operacion.cancelar(confirmada)
  await operacion.cancelar(otra)
  operacion.actualizar()
  assert.equal(escrituras, 1)
  assert.equal(lecturas, 0)
  assert.deepEqual(operacion.obtenerEstado().canceladas, [])
  escritura.resolver()
  await pendiente
  assert.deepEqual(operacion.obtenerEstado().canceladas, [confirmada.id_sesion])
  assert.equal(lecturas, 1)
  await operacion.cancelar(otra)
  assert.equal(escrituras, 1, 'Debe esperar una nueva consulta correcta')
  operacion.recibirConsulta({ estado: 'listo' })
  await operacion.cancelar(otra)
  assert.equal(escrituras, 2)
  await operacion.cancelar(confirmada)
  assert.equal(escrituras, 2, 'No debe repetir una cancelación confirmada')
  operacion.detener()
})

test('un resultado incierto o conflicto exige una consulta nueva correcta antes de otra escritura', async () => {
  for (const tipo of ['incierto', 'conflicto', 'ausente']) {
    let escrituras = 0, lecturas = 0
    const consulta = { estado: 'listo' }
    const operacion = preparar({ cancelar: async () => { escrituras++; throw new ErrorCancelarSesion('Comprueba el estado', tipo) }, recargar: () => lecturas++ })
    operacion.recibirConsulta(consulta)
    await operacion.cancelar(confirmada)
    operacion.recibirConsulta(consulta)
    await operacion.cancelar(confirmada)
    operacion.recibirConsulta({ estado: 'error' })
    await operacion.cancelar(otra)
    assert.equal(escrituras, 1)
    assert.equal(lecturas, 1)
    assert.equal(operacion.obtenerEstado().necesitaActualizar, true)
    assert.deepEqual(operacion.obtenerEstado().canceladas, [])
    operacion.actualizar()
    operacion.recibirConsulta({ estado: 'cargando' })
    await operacion.cancelar(confirmada)
    assert.equal(escrituras, 1)
    operacion.recibirConsulta({ estado: 'listo' })
    assert.equal(operacion.obtenerEstado().necesitaActualizar, false)
    operacion.detener()
  }
})

test('401 y 403 conservan la sesión mostrada, bloquean acciones y no disparan nuevas consultas', async () => {
  for (const tipo of ['sesion', 'permiso']) {
    let escrituras = 0
    const operacion = preparar({ cancelar: async () => { escrituras++; throw new ErrorCancelarSesion('Acceso denegado', tipo) }, recargar: () => assert.fail('No debe consultar sin acceso') })
    await operacion.cancelar(confirmada)
    await operacion.cancelar(otra)
    operacion.actualizar()
    assert.equal(escrituras, 1)
    assert.deepEqual(operacion.obtenerEstado().canceladas, [])
    operacion.detener()
  }
})

test('al salir aborta la escritura y descarta su resultado tardío', async () => {
  const escritura = diferida()
  let signal
  const operacion = preparar({ cancelar: (_id, externa) => { signal = externa; return escritura.promesa }, recargar: () => assert.fail('No debe consultar tras salir') })
  const pendiente = operacion.cancelar(confirmada)
  operacion.detener()
  const estado = operacion.obtenerEstado()
  assert.equal(signal.aborted, true)
  escritura.resolver()
  await pendiente
  assert.equal(operacion.obtenerEstado(), estado)
})

const estadoUI = (idUsuario, cambios = {}) => ({ idUsuario, cancelando: null, canceladas: [], error: null,
  necesitaActualizar: false, bloqueada: false, puedeActualizar: true, cancelar() {}, actualizar() {}, ...cambios })
const render = (Componente, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Componente, props)))
const paginaDetalle = (datos, cancelacion) => render(Detalle, { consulta: { estado: 'listo', datos }, idUsuario: cancelacion.idUsuario,
  nombres: new Map(), volver: '/panel?vista=historial', onRecargar() {}, cancelacion })

test('el detalle ofrece cancelar a los dos participantes y respeta los permisos y la hora de inicio', () => {
  for (const usuario of [estudiante, tutor]) {
    const estado = estadoUI(usuario.idUsuario)
    assert.match(paginaDetalle(detalle, estado), /aria-label="Cancelar tutoría #9007199254740997"/)
    assert.doesNotMatch(paginaDetalle({ ...detalle, inicio: '2000-01-01T18:00:00.000Z' }, estado), /Cancelar tutoría/)
    assert.doesNotMatch(paginaDetalle({ ...detalle, acciones_disponibles: { ...acciones, cancelar: false } }, estado), /Cancelar tutoría/)
    assert.doesNotMatch(paginaDetalle({ ...detalle, estado_sesion: 'CANCELADA' }, estado), /Cancelar tutoría/)
  }
  assert.doesNotMatch(paginaDetalle(detalle, estadoUI('99')), /Cancelar tutoría/)
  const enCurso = paginaDetalle(detalle, estadoUI(tutor.idUsuario, { cancelando: confirmada.id_sesion, bloqueada: true, puedeActualizar: false }))
  assert.match(enCurso, /Cancelando…/)
  assert.equal((enCurso.match(/disabled=""/g) ?? []).length, 2, 'Actualizar y cancelar quedan bloqueados')
})

test('el listado retira solo las cancelaciones confirmadas, corrige el contador y muestra éxito o acceso vencido', () => {
  const consulta = { estado: 'listo', sesiones: [confirmada] }
  const html = render(SesionesActivas, { consulta, onRecargar() {}, cancelacion: estadoUI(estudiante.idUsuario, { canceladas: [confirmada.id_sesion] }) })
  assert.match(html, /Sesiones activas \(0\)/)
  assert.match(html, /Tutoría #9007199254740997 cancelada\./)
  assert.doesNotMatch(html, /Cancelar tutoría|Ver detalle de la tutoría/)
  const error = render(SesionesActivas, { consulta, onRecargar() {}, cancelacion: estadoUI(estudiante.idUsuario, {
    error: new ErrorCancelarSesion('Inicia sesión nuevamente', 'sesion'), bloqueada: true, puedeActualizar: false }) })
  assert.match(error, /href="\/login"/)
  assert.match(error, /Sesiones activas \(1\)/)
  assert.equal((error.match(/disabled=""/g) ?? []).length, 2)
})

test('recorre el servicio real de cancelación y la nueva consulta de listado y detalle con HTTP simulado', async () => {
  for (const usuario of [estudiante, tutor]) {
    const orden = []
    let yaCancelada = false, lectura, operacion
    globalThis.fetch = async (url, opciones) => {
      const ruta = new URL(url).pathname
      assert.equal(opciones.headers.Authorization, 'Bearer ' + usuario.token)
      if (opciones.method === 'PATCH') {
        orden.push('PATCH'); yaCancelada = true
        return Response.json(cancelada)
      }
      orden.push('GET')
      if (ruta.endsWith('/active')) return Response.json(yaCancelada ? [] : [confirmada])
      return Response.json(yaCancelada ? { ...detalle, ...cancelada, acciones_disponibles: { ...acciones, cancelar: false } } : detalle)
    }
    const consultar = async () => {
      const datos = usuario === estudiante ? await consultarSesionesActivas(usuario) : await consultarDetalleTutoria(usuario, confirmada.id_sesion)
      operacion.recibirConsulta({ estado: 'listo', datos })
      return datos
    }
    operacion = preparar({ idUsuario: usuario.idUsuario, cancelar: (id, signal) => cancelarSesion(id, usuario, signal),
      recargar: () => { lectura = consultar() } })
    await consultar()
    await operacion.cancelar(confirmada)
    const datos = await lectura
    assert.deepEqual(orden, ['GET', 'PATCH', 'GET'])
    assert.equal(operacion.obtenerEstado().necesitaActualizar, false)
    if (usuario === estudiante) assert.deepEqual(datos, [])
    else assert.equal(datos.estado_sesion, 'CANCELADA')
    operacion.detener()
  }
})
