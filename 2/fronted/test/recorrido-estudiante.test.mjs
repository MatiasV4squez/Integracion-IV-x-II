import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, crearSolicitudTutoria, ErrorCrearSolicitud, obtenerTutores, SelectorTutorBloque, SeleccionMateriaTutoria, SolicitarTutoriaPage
const fetchOriginal = globalThis.fetch
const seleccion = { id_tutor: '12', id_materia: '3', id_bloque: '25' }
const tutor = (idTutor, horarios = [{ idBloque: '25', dia: '2026-11-03', horaInicio: '10:00', horaFin: '11:00' }]) => ({
  idTutor, promedioCalificaciones: null, cantidadCalificaciones: 0, horariosDisponibles: horarios,
})
const pagina = (items, page, totalPages) => ({ items, total: totalPages * 100, page, limit: 100, totalPages })

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ crearSolicitudTutoria, ErrorCrearSolicitud } = await vite.ssrLoadModule('/src/features/sesiones/services/crear-solicitud-api.ts'))
  ;({ obtenerTutores } = await vite.ssrLoadModule('/src/features/tutores/services/disponibilidad-tutores-api.ts'))
  ;({ SelectorTutorBloque } = await vite.ssrLoadModule('/src/features/tutores/components/SelectorTutorBloque.tsx'))
  ;({ SeleccionMateriaTutoria } = await vite.ssrLoadModule('/src/features/sesiones/components/SeleccionMateriaTutoria.tsx'))
  ;({ default: SolicitarTutoriaPage } = await vite.ssrLoadModule('/src/features/sesiones/pages/SolicitarTutoriaPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

const base = () => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '')

test('la solicitud explica cada rechazo de agendamiento sin exponer detalles internos', async () => {
  for (const [status, mensaje, recargar] of [
    [400, /no es válida/, false], [401, /sesión/, false], [404, /ya no está disponible/, true],
    [409, /cuatro solicitudes pendientes/, true], [503, /no está disponible en este momento/, false],
    [500, /No se pudo crear/, false],
  ]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return Response.json({ message: 'Prisma P2034 interno' }, { status }) }
    await assert.rejects(crearSolicitudTutoria(seleccion, 'jwt'), (error) => {
      assert.ok(error instanceof ErrorCrearSolicitud)
      assert.match(error.message, mensaje, String(status))
      assert.doesNotMatch(error.message, /Prisma/)
      assert.equal(error.requiereRecargarHorarios, recargar, String(status))
      return true
    })
    assert.equal(llamadas, 1, 'Nunca reintenta la reserva')
  }
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(crearSolicitudTutoria(seleccion, 'jwt'), /Revisa Mi panel antes de volver a intentarlo/)
  globalThis.fetch = async () => Response.json({ ok: true }, { status: 201 })
  await assert.rejects(crearSolicitudTutoria(seleccion, 'jwt'), /respuesta no es válida/)
})

test('la solicitud usa la URL configurada del Gateway y admite cancelación', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(url, base() + '/agendamiento-sesiones/sessions')
    assert.ok(opciones.signal instanceof AbortSignal)
    return Response.json({ id_sesion: '7', estado_sesion: 'PENDIENTE', id_tutee: '99' }, { status: 201 })
  }
  assert.deepEqual(await crearSolicitudTutoria(seleccion, 'jwt'), { id_sesion: '7', estado_sesion: 'PENDIENTE' })
  const control = new AbortController()
  control.abort()
  globalThis.fetch = () => { assert.fail('No debe enviar una solicitud cancelada') }
  await assert.rejects(crearSolicitudTutoria(seleccion, 'jwt', control.signal), { name: 'AbortError' })
})

test('carga todos los tutores de la materia recorriendo las páginas de la búsqueda', async () => {
  const pedidas = []
  globalThis.fetch = async (url, opciones) => {
    assert.equal(opciones.headers.Authorization, 'Bearer token-estudiante-prueba')
    const direccion = new URL(url)
    assert.equal(direccion.origin + direccion.pathname, base() + '/materias-tutores/tutores')
    const page = Number(direccion.searchParams.get('page'))
    pedidas.push([direccion.searchParams.get('materiaId'), page, direccion.searchParams.get('limit')])
    return Response.json(pagina([tutor(String(10 + page))], page, 3))
  }
  const tutores = await obtenerTutores('3', new AbortController().signal, 'token-estudiante-prueba')
  assert.deepEqual(tutores.map((item) => item.idTutor), ['11', '12', '13'])
  assert.deepEqual(pedidas, [['3', 1, '100'], ['3', 2, '100'], ['3', 3, '100']])

  globalThis.fetch = async () => Response.json({ items: 'no' })
  await assert.rejects(obtenerTutores('3', new AbortController().signal, 'token-estudiante-prueba'), /No pudimos leer los resultados/)
})

test('preselecciona el tutor elegido en la búsqueda solo si sigue disponible', () => {
  const render = (idTutorInicial) => renderToStaticMarkup(createElement(SelectorTutorBloque, {
    idMateria: '3', tutores: [tutor('11'), tutor('12')], idTutorInicial, alSeleccionar() {},
  }))
  assert.match(render('12'), /<option value="12" selected="">/)
  assert.match(render('12'), /Fechas disponibles/)
  assert.match(render('99'), /<option value="" selected="">Selecciona un tutor/)
  assert.match(render('99'), /Selecciona un tutor para consultar/)
})

test('sin materia en la URL se pide elegirla del catálogo, y tras enviar se enlaza a Mi panel', () => {
  const materias = [{ idMateria: '3', codigo: 'MAT101', nombre: 'Cálculo I' }]
  const selector = renderToStaticMarkup(createElement(SeleccionMateriaTutoria, { materias, materiaInvalida: false, onElegir() {} }))
  assert.match(selector, /<option value="3">MAT101 · Cálculo I<\/option>/)
  assert.match(selector, /disabled="">Ver tutores disponibles/)
  assert.doesNotMatch(selector, /role="alert"/)
  assert.match(renderToStaticMarkup(createElement(SeleccionMateriaTutoria, { materias, materiaInvalida: true, onElegir() {} })),
    /role="alert">La materia indicada no existe/)

  const enviada = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SolicitarTutoriaPage, {
    idMateria: '3', nombreMateria: 'Cálculo I', tutores: [tutor('12')], seleccion, cargando: false, errorCarga: null,
    enviando: false, error: null, sesionCreada: { id_sesion: '7', estado_sesion: 'PENDIENTE' }, alSeleccionar() {}, alEnviar() {},
  })))
  assert.match(enviada, /Solicitud enviada/)
  assert.match(enviada, /href="\/panel"/)
  assert.doesNotMatch(enviada, /Cálculo intermedio/)
})
