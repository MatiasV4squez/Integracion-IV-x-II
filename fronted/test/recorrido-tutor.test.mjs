import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, disponibilidad, sesiones, crearSolicitudTutoria, obtenerTutores, aceptarSolicitud, crearBandejaSolicitudes
let DisponibilidadPage, SolicitudesRecibidasPage, DashboardTutorPage, seleccionarProximasSesionesTutor
const fetchOriginal = globalThis.fetch
const tutor = { token: 'token-tutor-prueba', idUsuario: '9007199254740993', roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const tokenEstudiante = 'token-estudiante-prueba'
const ahora = Date.parse('2099-11-10T12:00:00Z')
const horario = { dia: '2099-11-10', horaInicio: '10:00', horaFin: '11:00' }
const bloque = { idBloque: '9007199254740995', ...horario, estadoBloque: 'DISPONIBLE' }
const reservada = { ...bloque, estadoBloque: 'RESERVADO' }
const materias = [{ idMateria: '3', codigo: 'MAT101', nombre: 'Cálculo I' }]
const pendiente = {
  id_sesion: '9007199254740997', id_tutor: tutor.idUsuario, id_tutee: '15', id_materia: '3', id_bloque: bloque.idBloque,
  estado_sesion: 'PENDIENTE', inicio: '2099-11-10T13:00:00.000Z', fin: '2099-11-10T14:00:00.000Z',
  fecha_creacion: '2099-11-10T11:00:00.000Z', fecha_actualizacion: '2099-11-10T11:00:00.000Z', resultado_provisional: false,
}
const confirmada = { ...pendiente, estado_sesion: 'CONFIRMADA' }
const comoEstudiante = { ...pendiente, id_sesion: '80', id_tutor: '99', id_tutee: tutor.idUsuario }
const rutaBloques = 'materias-tutores/disponibilidad/bloques'
const rutaSesiones = 'agendamiento-sesiones/sessions'
const rutaHistorial = rutaSesiones + '/history'
const rutaAceptar = rutaSesiones + '/' + pendiente.id_sesion + '/accept'

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  disponibilidad = await vite.ssrLoadModule('/src/features/disponibilidad/services/disponibilidad-api.ts')
  sesiones = await vite.ssrLoadModule('/src/features/sesiones/services/sesiones-api.ts')
  ;({ crearSolicitudTutoria } = await vite.ssrLoadModule('/src/features/sesiones/services/crear-solicitud-api.ts'))
  ;({ obtenerTutores } = await vite.ssrLoadModule('/src/features/tutores/services/disponibilidad-tutores-api.ts'))
  ;({ aceptarSolicitud } = await vite.ssrLoadModule('/src/features/sesiones/services/aceptar-solicitud-api.ts'))
  ;({ crearBandejaSolicitudes } = await vite.ssrLoadModule('/src/features/sesiones/aplicacion/bandeja-solicitudes.ts'))
  ;({ seleccionarProximasSesionesTutor } = await vite.ssrLoadModule('/src/features/sesiones/utils/solicitudes-recibidas.ts'))
  ;({ default: DisponibilidadPage } = await vite.ssrLoadModule('/src/features/disponibilidad/pages/DisponibilidadPage.tsx'))
  ;({ default: SolicitudesRecibidasPage } = await vite.ssrLoadModule('/src/features/sesiones/pages/SolicitudesRecibidasPage.tsx'))
  ;({ default: DashboardTutorPage } = await vite.ssrLoadModule('/src/features/panel-tutor/pages/DashboardTutorPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

// Respuestas controladas: se integran los servicios web reales, sin simular reglas del backend.
function simularApi(t, pasos) {
  const llamadas = []
  globalThis.fetch = async (url, opciones = {}) => {
    const paso = pasos[llamadas.length]
    llamadas.push({
      ruta: String(url), metodo: opciones.method ?? 'GET', token: opciones.headers?.Authorization ?? null,
      cuerpo: opciones.body === undefined ? undefined : JSON.parse(opciones.body),
    })
    assert.ok(paso, 'No se esperaba otra petición HTTP')
    return Response.json(paso.datos, { status: paso.estado ?? 200 })
  }
  // Se comprueba fuera de fetch para que los servicios no absorban una aserción como error de red.
  t.after(() => assert.deepEqual(llamadas, pasos.map((paso) => ({
    ruta: vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/' + paso.ruta,
    metodo: paso.metodo ?? 'GET', token: paso.token === null ? null : 'Bearer ' + (paso.token ?? tutor.token),
    cuerpo: paso.cuerpo,
  }))))
}

function nuevaBandeja(t) {
  const bandeja = crearBandejaSolicitudes({
    consultar: (signal) => sesiones.consultarSolicitudesRecibidas(tutor, signal),
    aceptar: (id, signal) => aceptarSolicitud(id, tutor, signal),
  })
  t.after(() => bandeja.detener())
  return bandeja
}

const render = (Page, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, props)))
const verSolicitudes = (bandeja) => render(SolicitudesRecibidasPage, {
  ...bandeja.obtenerEstado(), materias, ahora, onRecargar: bandeja.recargar, onAceptar: bandeja.aceptar,
})
const verDisponibilidad = (bloques) => render(DisponibilidadPage, {
  consulta: { estado: 'listo', bloques }, bloqueEditado: null, guardando: false, errorOperacion: null, mensaje: null,
  onRecargar() {}, onEditar() {}, onGuardar: async () => true, onEliminar: async () => true, onCancelar() {},
})

test('recorre disponibilidad, solicitud del estudiante, aceptación y nueva consulta del panel del tutor', async (t) => {
  const seleccion = { id_tutor: tutor.idUsuario, id_materia: '3', id_bloque: bloque.idBloque }
  simularApi(t, [
    { ruta: rutaBloques, datos: [] },
    { ruta: rutaBloques, metodo: 'POST', cuerpo: horario, datos: bloque, estado: 201 },
    { ruta: rutaBloques, datos: [bloque] },
    { ruta: 'materias-tutores/tutores?materiaId=3&page=1&limit=100', token: null, datos: {
      items: [{ idTutor: tutor.idUsuario, promedioCalificaciones: null, cantidadCalificaciones: 0,
        horariosDisponibles: [{ idBloque: bloque.idBloque, ...horario }] }], total: 1, page: 1, limit: 100, totalPages: 1,
    } },
    { ruta: rutaSesiones, metodo: 'POST', token: tokenEstudiante, cuerpo: seleccion, datos: pendiente, estado: 201 },
    { ruta: rutaHistorial, datos: [pendiente, comoEstudiante] },
    { ruta: rutaAceptar, metodo: 'PATCH', datos: confirmada },
    { ruta: rutaHistorial, datos: [confirmada, comoEstudiante] },
    { ruta: rutaBloques, datos: [reservada] },
    { ruta: rutaHistorial, datos: [confirmada, comoEstudiante] },
    { ruta: rutaHistorial, datos: [confirmada, comoEstudiante] },
  ])

  assert.match(verDisponibilidad(await disponibilidad.consultarBloquesDisponibilidad(tutor)), /Aún no tienes bloques/)
  const creado = await disponibilidad.crearBloqueDisponibilidad(tutor, horario)
  const publicados = await disponibilidad.consultarBloquesDisponibilidad(tutor)
  assert.deepEqual(publicados, [creado])
  assert.match(verDisponibilidad(publicados), />Disponible<\/span>/)

  const [encontrado] = await obtenerTutores('3', new AbortController().signal)
  const solicitud = await crearSolicitudTutoria({
    id_tutor: encontrado.idTutor, id_materia: '3', id_bloque: encontrado.horariosDisponibles[0].idBloque,
  }, tokenEstudiante)
  assert.deepEqual(solicitud, { id_sesion: pendiente.id_sesion, estado_sesion: 'PENDIENTE' })

  const bandeja = nuevaBandeja(t)
  await bandeja.iniciar()
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [pendiente])
  assert.match(verSolicitudes(bandeja), new RegExp('Aceptar solicitud #' + solicitud.id_sesion))
  assert.match(verSolicitudes(bandeja), /Cálculo I/)
  await bandeja.aceptar(solicitud.id_sesion)
  assert.equal(bandeja.obtenerEstado().aceptacion.estado, 'aceptada')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [])
  assert.match(verSolicitudes(bandeja), /La tutoría está confirmada/)
  assert.doesNotMatch(verSolicitudes(bandeja), /Aceptar solicitud #/)

  const bloques = await disponibilidad.consultarBloquesDisponibilidad(tutor)
  assert.deepEqual(bloques, [reservada])
  assert.match(verDisponibilidad(bloques), /disabled=""[^>]*aria-label="Editar bloque/)
  const recargada = nuevaBandeja(t)
  await recargada.iniciar()
  assert.match(verSolicitudes(recargada), /No tienes solicitudes pendientes/)
  const historial = await sesiones.consultarHistorialTutor(tutor)
  const proximas = seleccionarProximasSesionesTutor(historial, tutor.idUsuario, ahora)
  assert.deepEqual(proximas, [confirmada])
  const panel = render(DashboardTutorPage, {
    ...recargada.obtenerEstado(), solicitudes: recargada.obtenerEstado().consulta, materias, ahora,
    proximas, completadas: 0, disponibilidad: { estado: 'listo', bloques },
    onAceptar: recargada.aceptar, onActualizar() {}, onRecargarDisponibilidad() {},
  })
  assert.match(panel, /Próximas sesiones/)
  assert.match(panel, /Cálculo I/)
  assert.match(panel, /Reservado/)
  assert.match(panel, /No tienes solicitudes pendientes/)
})

test('un conflicto al atender una solicitud reconcilia el listado sin anunciar éxito ni repetir la aceptación', async (t) => {
  simularApi(t, [
    { ruta: rutaHistorial, datos: [pendiente] },
    { ruta: rutaAceptar, metodo: 'PATCH', estado: 409, datos: { message: 'Conflicto' } },
    { ruta: rutaHistorial, datos: [confirmada] },
  ])
  const bandeja = nuevaBandeja(t)
  await bandeja.iniciar()
  assert.match(verSolicitudes(bandeja), /Aceptar solicitud #/)
  await bandeja.aceptar(pendiente.id_sesion)
  assert.equal(bandeja.obtenerEstado().aceptacion.tipo, 'conflicto')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [])
  assert.match(verSolicitudes(bandeja), /No se pudo aceptar/)
  assert.doesNotMatch(verSolicitudes(bandeja), /La tutoría está confirmada|Aceptar solicitud #/)
  await bandeja.aceptar(pendiente.id_sesion)
})

test('una sesión vencida al aceptar conserva la solicitud y pide autenticarse sin nuevas peticiones', async (t) => {
  simularApi(t, [
    { ruta: rutaHistorial, datos: [pendiente] },
    { ruta: rutaAceptar, metodo: 'PATCH', estado: 401, datos: { message: 'Unauthorized' } },
  ])
  const bandeja = nuevaBandeja(t)
  await bandeja.iniciar()
  await bandeja.aceptar(pendiente.id_sesion)
  assert.equal(bandeja.obtenerEstado().aceptacion.tipo, 'sesion')
  assert.deepEqual(bandeja.obtenerEstado().consulta.solicitudes, [pendiente])
  assert.match(verSolicitudes(bandeja), /href="\/login"/)
  assert.doesNotMatch(verSolicitudes(bandeja), /La tutoría está confirmada/)
  await bandeja.recargar()
  await bandeja.aceptar(pendiente.id_sesion)
})
