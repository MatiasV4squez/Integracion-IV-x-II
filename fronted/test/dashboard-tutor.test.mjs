import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, consultarHistorialTutor, seleccionarProximasSesionesTutor, seleccionarProximosBloques, Page, AppRoutes, navegacion
const fetchOriginal = globalThis.fetch
const tutorId = '12'
const tutor = { token: 'token-tutor-prueba', idUsuario: tutorId, roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const ahora = Date.parse('2026-10-31T02:00:00Z') // 30 de octubre, 23:00 en Chile continental
const sesionBase = {
  id_sesion: '70', id_tutor: tutorId, id_tutee: '15', id_materia: '3', id_bloque: '26', estado_sesion: 'PENDIENTE',
  inicio: '2026-11-02T18:00:00.000Z', fin: '2026-11-02T19:00:00.000Z',
  fecha_creacion: '2026-10-30T10:00:00.000Z', fecha_actualizacion: '2026-10-30T10:00:00.000Z', resultado_provisional: false,
}
const sesion = (cambios) => ({ ...sesionBase, ...cambios })
const pendientes = ['71', '72', '73', '74'].map((id, indice) => sesion({ id_sesion: id, id_tutee: String(20 + indice) }))
const confirmadaLuego = sesion({ id_sesion: '80', estado_sesion: 'CONFIRMADA', inicio: '2026-11-04T15:00:00.000Z', fin: '2026-11-04T16:00:00.000Z' })
const confirmadaEnCurso = sesion({ id_sesion: '81', estado_sesion: 'CONFIRMADA', id_materia: '4', inicio: '2026-10-31T01:30:00.000Z', fin: '2026-10-31T02:30:00.000Z' })
const confirmadaPasada = sesion({ id_sesion: '82', estado_sesion: 'CONFIRMADA', inicio: '2026-10-30T12:00:00.000Z', fin: '2026-10-30T13:00:00.000Z' })
const completada = sesion({ id_sesion: '83', estado_sesion: 'COMPLETADA', inicio: '2026-10-20T12:00:00.000Z', fin: '2026-10-20T13:00:00.000Z' })
const comoEstudiante = sesion({ id_sesion: '90', id_tutor: '99', id_tutee: tutorId, estado_sesion: 'CONFIRMADA' })
const bloque = (idBloque, dia, horaInicio, estadoBloque = 'DISPONIBLE') => ({ idBloque, dia, horaInicio, horaFin: horaInicio.replace(/^(\d\d)/, (h) => String(Number(h) + 1).padStart(2, '0')), estadoBloque })
const bloques = [
  bloque('5', '2026-11-03', '10:00'),
  bloque('1', '2026-10-29', '09:00'),
  bloque('2', '2026-10-30', '18:00', 'RESERVADO'),
  bloque('3', '2026-10-30', '08:00'),
  bloque('4', '2026-11-01', '12:00', 'INACTIVO'),
]
const materias = [{ idMateria: '3', codigo: 'MAT101', nombre: 'Cálculo I' }, { idMateria: '4', codigo: 'INF110', nombre: 'Programación I' }]

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarHistorialTutor } = await vite.ssrLoadModule('/src/features/sesiones/services/sesiones-api.ts'))
  ;({ seleccionarProximasSesionesTutor } = await vite.ssrLoadModule('/src/features/sesiones/utils/solicitudes-recibidas.ts'))
  ;({ seleccionarProximosBloques } = await vite.ssrLoadModule('/src/features/panel-tutor/utils/resumen-tutor.ts'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/panel-tutor/pages/DashboardTutorPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  navegacion = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts')
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('el historial del tutor excluye las sesiones en que participa como estudiante', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/history')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + tutor.token)
    return Response.json([pendientes[0], comoEstudiante, completada])
  }
  assert.deepEqual(await consultarHistorialTutor(tutor), [pendientes[0], completada])
  globalThis.fetch = () => { assert.fail('No debe consultar sin el rol tutor') }
  await assert.rejects(consultarHistorialTutor({ ...tutor, roles: ['ESTUDIANTE'] }), (error) => error.tipo === 'permiso')
})

test('las próximas sesiones son las confirmadas propias que aún no terminan, por orden de inicio', () => {
  const historial = [confirmadaLuego, completada, confirmadaPasada, ...pendientes, confirmadaEnCurso, comoEstudiante]
  assert.deepEqual(seleccionarProximasSesionesTutor(historial, tutorId, ahora).map((clase) => clase.id_sesion), ['81', '80'])
})

test('los próximos bloques usan la fecha de Chile y omiten días pasados e inactivos', () => {
  assert.deepEqual(seleccionarProximosBloques(bloques, ahora).map((item) => item.idBloque), ['3', '2', '5'])
})

const pagina = (propiedades = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, {
  nombre: 'Camila González', ahora, materias,
  solicitudes: { estado: 'listo', solicitudes: pendientes },
  aceptacion: { estado: 'inicial' }, bloqueada: false, actualizando: false,
  proximas: [confirmadaEnCurso, confirmadaLuego], completadas: 1,
  disponibilidad: { estado: 'listo', bloques },
  onAceptar: () => {}, onActualizar: () => {}, onRecargarDisponibilidad: () => {},
  ...propiedades,
})))

test('resume la actividad e integra las solicitudes recibidas con su acción de aceptar', () => {
  const html = pagina()
  assert.match(html, /Hola, Camila González/)
  assert.match(html, /Solicitudes por responder<\/span><strong>4<\/strong>/)
  assert.match(html, /Bloques disponibles<\/span><strong>2<\/strong><small>1 reservado desde hoy/)
  assert.match(html, /Tutorías completadas<\/span><strong>1<\/strong>/)
  assert.match(html, /Próxima sesión<\/span><strong>[^<]+<\/strong><small>Programación I/)
  assert.equal((html.match(/aria-label="Aceptar solicitud #/g) ?? []).length, 3, 'Muestra las tres más antiguas')
  assert.doesNotMatch(html, /solicitud #74/)
  assert.match(html, /Y 1 más/)
  assert.match(html, /href="\/solicitudes\/recibidas"[^>]*>Ver todas \(4\)/)
})

test('muestra las próximas sesiones y la disponibilidad con enlaces a sus pantallas', () => {
  const html = pagina()
  assert.match(html, /Próximas sesiones[\s\S]*Programación I[\s\S]*En curso[\s\S]*Cálculo I/)
  assert.match(html, /href="\/disponibilidad"/)
  assert.match(html, /08:00–09:00[\s\S]*Disponible[\s\S]*18:00–19:00[\s\S]*Reservado/)
  assert.doesNotMatch(html, /09:00–10:00|Inactivo/)
})

test('cada sección presenta su carga, vacío y error de forma independiente', () => {
  const cargando = pagina({ solicitudes: { estado: 'cargando' }, proximas: null, completadas: null, disponibilidad: { estado: 'cargando' } })
  assert.match(cargando, /Cargando solicitudes…/)
  assert.match(cargando, /Cargando tus sesiones…/)
  assert.match(cargando, /Cargando tu disponibilidad…/)
  assert.equal((cargando.match(/<strong>—<\/strong>/g) ?? []).length, 4)

  const vacio = pagina({ solicitudes: { estado: 'listo', solicitudes: [] }, proximas: [], disponibilidad: { estado: 'listo', bloques: [] } })
  assert.match(vacio, /No tienes solicitudes pendientes/)
  assert.match(vacio, /No tienes sesiones confirmadas próximamente/)
  assert.match(vacio, /Agregar disponibilidad/)

  const errores = pagina({
    solicitudes: { estado: 'error', mensaje: 'No pudimos cargar las solicitudes. Inténtalo de nuevo.', tipo: 'consulta' },
    proximas: null, completadas: null,
    disponibilidad: { estado: 'error', mensaje: 'No pudimos cargar tu disponibilidad.' },
  })
  assert.match(errores, /No pudimos cargar las solicitudes/)
  assert.match(errores, /No pudimos cargar tus sesiones\. Pulsa Actualizar/)
  assert.match(errores, /No pudimos cargar tu disponibilidad[\s\S]*Reintentar/)

  const aceptando = pagina({ aceptacion: { estado: 'aceptando', idSesion: '71' }, bloqueada: true })
  assert.match(aceptando, /Aceptando solicitud #71/)
  assert.match(aceptando, /disabled="">Actualizar/)
})

test('el dashboard es el inicio del tutor y la ruta exige sesión', async () => {
  assert.equal(navegacion.obtenerInicioPorRol(['TUTOR']), '/tutor')
  const enlaces = navegacion.obtenerNavegacion(['TUTOR'])
  assert.deepEqual(enlaces[0], { etiqueta: 'Inicio', destino: '/tutor' })
  for (const destino of ['/solicitudes/recibidas', '/disponibilidad']) {
    assert.ok(enlaces.some((enlace) => enlace.destino === destino), destino)
  }
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/tutor'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión…/)
  assert.doesNotMatch(html, /resumen de tu actividad/)
})
