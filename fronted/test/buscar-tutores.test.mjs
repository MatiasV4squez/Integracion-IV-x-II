import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route } from 'react-router'
import { createServer } from 'vite'

let server
let buscarTutores
let ErrorConsultaTutores
let leerParametrosBusqueda
let BuscarTutoresPage
let BusquedaTutoresForm
let CatalogoMateriasPage
let AppRoutes
const fetchOriginal = globalThis.fetch
const materia = { idMateria: '9007199254740993', codigo: 'MAT1188', nombre: 'Cálculo' }
const tutor = {
  idTutor: '9007199254740995', promedioCalificaciones: 4.5, cantidadCalificaciones: 2,
  horariosDisponibles: [{ idBloque: '31', dia: '2026-12-01', horaInicio: '10:00', horaFin: '11:00' }],
}
const resultado = { items: [tutor], total: 1, page: 1, limit: 10, totalPages: 1 }
const opciones = { materiaId: materia.idMateria }

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ buscarTutores, ErrorConsultaTutores } = await server.ssrLoadModule('/src/features/tutores/services/tutores-api.ts'))
  ;({ leerParametrosBusqueda } = await server.ssrLoadModule('/src/features/tutores/utils/leer-parametros-busqueda.ts'))
  ;({ default: BuscarTutoresPage } = await server.ssrLoadModule('/src/features/tutores/pages/BuscarTutoresPage.tsx'))
  ;({ BusquedaTutoresForm } = await server.ssrLoadModule('/src/features/tutores/components/BusquedaTutoresForm.tsx'))
  ;({ default: CatalogoMateriasPage } = await server.ssrLoadModule('/src/features/materias/pages/CatalogoMateriasPage.tsx'))
  ;({ AppRoutes } = await server.ssrLoadModule('/src/app/AppRoutes.tsx'))
})

afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await server?.close() })

test('consulta exclusivamente el Gateway con el ID completo y los parámetros de paginación', async () => {
  globalThis.fetch = async (url, config) => {
    assert.equal(String(url), server.config.env.VITE_API_BASE_URL.replace(/\/+$/, '')
      + '/materias-tutores/tutores?materiaId=9007199254740993&page=2&limit=2')
    assert.equal(config.headers.Accept, 'application/json')
    assert.ok(config.signal instanceof AbortSignal)
    return Response.json({ ...resultado, total: 3, page: 2, limit: 2, totalPages: 2 })
  }
  const datos = await buscarTutores({ ...opciones, page: 2, limit: 2 })
  assert.equal(datos.items[0].idTutor, tutor.idTutor)
  assert.equal(datos.page, 2)
  assert.equal(datos.total, 3)
})

test('conserva resultados vacíos y no utiliza una caché de tutores', async () => {
  let consultas = 0
  globalThis.fetch = async () => {
    consultas++
    return Response.json({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 })
  }
  assert.deepEqual((await buscarTutores(opciones)).items, [])
  await buscarTutores(opciones)
  assert.equal(consultas, 2)
})

test('no inventa nombres ni traslada campos internos de la API', async () => {
  globalThis.fetch = async () => Response.json({
    ...resultado, secreto: 'privado', items: [{ ...tutor, nombre: 'Campo no contratado', secreto: 'privado' }],
  })
  assert.deepEqual(await buscarTutores(opciones), resultado)
})

test('rechaza parámetros inválidos antes de realizar solicitudes', async () => {
  globalThis.fetch = () => { assert.fail('No debe consultar la API') }
  for (const entrada of [
    { materiaId: 'MAT1188' }, { materiaId: '0' }, { materiaId: '9223372036854775808' },
    { ...opciones, page: 0 }, { ...opciones, page: 1.5 }, { ...opciones, limit: 101 },
    { ...opciones, page: Number.MAX_SAFE_INTEGER },
  ]) {
    await assert.rejects(buscarTutores(entrada), ErrorConsultaTutores)
  }
})

test('maneja errores HTTP sin mostrar sus cuerpos internos', async () => {
  for (const [status, mensaje] of [
    [400, /no es válida/], [401, /iniciar sesión/], [403, /permiso/],
    [500, /consultar los tutores/], [502, /consultar los tutores/],
    [503, /consultar los tutores/], [504, /tardó demasiado/],
  ]) {
    globalThis.fetch = async () => new Response('detalle-privado', { status })
    await assert.rejects(buscarTutores(opciones), (error) => {
      assert.ok(error instanceof ErrorConsultaTutores)
      assert.match(error.message, mensaje)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
  }
})

test('distingue respuestas malformadas de fallos de red', async () => {
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(buscarTutores(opciones), /leer los resultados/)
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(buscarTutores(opciones), /conectar para buscar tutores/)
})

test('valida la estructura de resultados, fechas, calificaciones y paginación', async () => {
  for (const datos of [
    [], null, { ...resultado, items: [tutor, tutor] }, { ...resultado, page: 2 },
    { ...resultado, limit: 20 }, { ...resultado, totalPages: 3 }, { ...resultado, total: -1 },
    { ...resultado, items: [{ ...tutor, idTutor: Number(tutor.idTutor) }] },
    { ...resultado, items: [{ ...tutor, promedioCalificaciones: 6 }] },
    { ...resultado, items: [{ ...tutor, cantidadCalificaciones: 0 }] },
    { ...resultado, items: [{ ...tutor, horariosDisponibles: [{ ...tutor.horariosDisponibles[0], dia: '2026-02-30' }] }] },
    { ...resultado, items: [{ ...tutor, horariosDisponibles: [{ ...tutor.horariosDisponibles[0], horaFin: '09:00' }] }] },
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(buscarTutores(opciones), /leer los resultados/)
  }
})

test('propaga la cancelación sin convertirla en un error visible de conexión', async () => {
  const controlador = new AbortController()
  globalThis.fetch = (_url, config) => new Promise((_resolve, reject) => {
    config.signal.addEventListener('abort', () => reject(config.signal.reason), { once: true })
  })
  const solicitud = buscarTutores({ ...opciones, signal: controlador.signal })
  controlador.abort()
  await assert.rejects(solicitud, (error) => error.name === 'AbortError' && !(error instanceof ErrorConsultaTutores))
  globalThis.fetch = () => { assert.fail('La señal ya está cancelada') }
  await assert.rejects(buscarTutores({ ...opciones, signal: controlador.signal }), { name: 'AbortError' })
})

test('transforma el tiempo de espera agotado en un mensaje recuperable', async (t) => {
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, config) => { config.signal.throwIfAborted() }
  await assert.rejects(buscarTutores(opciones), /tardó demasiado/)
})

test('lee enlaces compartidos y rechaza IDs, páginas o parámetros duplicados inválidos', () => {
  assert.deepEqual(leerParametrosBusqueda(new URLSearchParams()), { materiaId: '', page: 1, error: undefined })
  assert.deepEqual(leerParametrosBusqueda(new URLSearchParams({ materiaId: materia.idMateria, page: '2' })), {
    materiaId: materia.idMateria, page: 2, error: undefined,
  })
  for (const consulta of [
    'materiaId=abc', 'materiaId=', 'materiaId=0', 'materiaId=1&materiaId=2', 'page=2',
    'materiaId=1&page=0', 'materiaId=1&page=1.5', 'materiaId=1&page=1&page=2',
    'materiaId=1&page=9007199254740991',
  ]) assert.ok(leerParametrosBusqueda(new URLSearchParams(consulta)).error)
})

function renderPagina(consulta, adicionales = {}) {
  return renderToStaticMarkup(createElement(BuscarTutoresPage, {
    materias: [materia], materiaId: materia.idMateria, cargandoMaterias: false,
    onReintentarMaterias() {}, consulta, onBuscar() {}, onReintentar() {}, onCambiarPagina() {},
    ...adicionales,
  }))
}

test('muestra estados inicial, carga, error con reintento y búsqueda sin coincidencias', () => {
  assert.match(renderPagina({ estado: 'inicial' }), /Selecciona una materia/)
  const cargando = renderPagina({ estado: 'cargando' })
  assert.match(cargando, /Buscando tutores/)
  assert.match(cargando, /aria-busy="true"/)
  assert.doesNotMatch(cargando, /0 tutores encontrados/)
  const error = renderPagina({ estado: 'error', mensaje: 'Servicio temporalmente no disponible' })
  assert.match(error, /role="alert"/)
  assert.match(error, />Reintentar<\/button>/)
  assert.match(renderPagina({ estado: 'listo', resultado: { ...resultado, items: [], total: 0, totalPages: 0 } }), /No encontramos tutores/)
  assert.match(renderPagina({ estado: 'inicial' }, { cargandoMaterias: true }), /Cargando materias/)
  assert.match(renderPagina({ estado: 'inicial' }, { errorMaterias: 'Error de catálogo' }), /Error de catálogo/)
})

test('muestra resultados, calificaciones y paginación, y ofrece recuperar una página fuera de rango', () => {
  const html = renderPagina({ estado: 'listo', resultado: { ...resultado, total: 21, totalPages: 3 } })
  assert.match(html, /21 tutores encontrados/)
  assert.match(html, /Próximo horario/)
  assert.match(html, /4,5 de 5/)
  assert.match(html, /Página 1 de 3/)
  assert.match(html, /disabled="">Anterior/)
  assert.match(html, /disabled=""[^>]*>Ver perfil<\/button>/)
  assert.doesNotMatch(html, /<header|<footer/)
  const fueraDeRango = renderPagina({ estado: 'listo', resultado: { ...resultado, items: [], total: 21, page: 4, totalPages: 3 } })
  assert.match(fueraDeRango, /Volver a la primera página/)
  assert.doesNotMatch(fueraDeRango, /No encontramos tutores/)
})

test('el formulario usa el ID como valor y deja inactivos los filtros no soportados', () => {
  const html = renderToStaticMarkup(createElement(BusquedaTutoresForm, {
    materias: [materia], materiaInicialId: materia.idMateria, onBuscar() {},
  }))
  assert.match(html, /name="materiaId"/)
  assert.match(html, /value="9007199254740993" selected=""/)
  assert.match(html, /name="disponibilidad" disabled=""/)
  assert.match(html, /name="orden" disabled=""/)
  assert.match(renderPagina({ estado: 'inicial' }), /<fieldset disabled=""/)
})

test('las tarjetas pueden enlazar a una búsqueda por ID', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(CatalogoMateriasPage, {
      materias: [materia], obtenerDestinoMateria: (item) => '/tutores?materiaId=' + item.idMateria + '&page=1',
    })))
  assert.match(html, /href="\/tutores\?materiaId=9007199254740993&amp;page=1"/)
})

test('conserva el acceso del equipo en la raíz y sus rutas generales al integrar las nuevas pantallas', () => {
  const renderRuta = (ruta) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [ruta] },
    createElement(AppRoutes, null,
      createElement(Route, { path: '/ruta-equipo', element: createElement('p', null, 'Pantalla del equipo') }),
      createElement(Route, { path: '/*', element: createElement('p', null, 'Acceso del equipo') }),
    )))
  assert.match(renderRuta('/ruta-equipo'), /Pantalla del equipo/)
  assert.match(renderRuta('/login'), /Acceso del equipo/)
  assert.match(renderRuta('/'), /Acceso del equipo/)
  assert.doesNotMatch(renderRuta('/solicitudes/recibidas'), /Acceso del equipo/)
})
