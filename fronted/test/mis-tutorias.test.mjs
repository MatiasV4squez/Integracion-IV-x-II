import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, api, filtros, Page, PanelPage, Detalle, AppRoutes, navegacion
const fetchOriginal = globalThis.fetch
const usuario = '9007199254740993'
const sesion = { token: 'jwt-prueba', idUsuario: usuario, roles: ['ESTUDIANTE'], expiraEn: Date.now() + 3600000 }
const tutoria = {
  id_sesion: '9007199254740997', id_tutee: usuario, id_tutor: '2', id_materia: '3', id_bloque: '4', estado_sesion: 'COMPLETADA',
  inicio: '2026-11-10T18:00:00.000Z', fin: '2026-11-10T19:00:00.000Z',
  fecha_creacion: '2026-11-09T10:00:00.000Z', fecha_actualizacion: '2026-11-10T20:00:00.000Z', resultado_provisional: false,
  calificaciones: [{ id_calificacion: '9', id_sesion: '9007199254740997', id_evaluador: usuario, id_evaluado: '2', puntuacion: 4, fecha_calificacion: '2026-11-10T20:00:00.000Z' }],
}
const detalle = {
  ...tutoria, datos_encuentro: { modalidad: 'EN_LINEA', lugar: null, enlace: 'https://meet.example.test/tutoria' },
  declaraciones: [{ id_declaracion: '6', id_sesion: tutoria.id_sesion, id_usuario: usuario, resultado_declarado: 'COMPLETADA', id_usuario_inasistente: null, fecha_declaracion: '2026-11-10T19:00:00.000Z' }],
  acciones_disponibles: { aceptar: false, rechazar: false, cancelar: false, declarar_cierre: false, calificar: false, resolver_conflicto: false },
}
const seleccion = { page: 1, limit: 10, rol: 'ESTUDIANTE', estado: 'COMPLETADA' }
const pagina = { items: [tutoria], total: 1, page: 1, limit: 10, totalPages: 1 }
const basePage = { idUsuario: usuario, roles: ['ESTUDIANTE'], consulta: { estado: 'listo', datos: pagina }, filtros: seleccion,
  materias: [{ idMateria: '3', codigo: 'INF-3', nombre: 'Programación III' }], nombres: new Map([['2', 'Camila'], [usuario, 'Martina']]),
  busqueda: '?page=1&limit=10&rol=ESTUDIANTE&estado=COMPLETADA&vista=historial', onFiltrar() {}, onLimpiar() {}, onRecargar() {},
}
const baseDetalle = { idUsuario: usuario, consulta: { estado: 'listo', datos: detalle }, materia: 'Programación III', nombres: basePage.nombres,
  volver: '/panel?page=2&limit=10&estado=COMPLETADA&vista=historial', onRecargar() {},
}
const render = (Componente, props) => renderToStaticMarkup(createElement(MemoryRouter, null,
  Componente === Page ? createElement(PanelPage, { sesiones: null, vista: 'historial', historial: createElement(Page, props) })
    : createElement(Componente, props)))

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  api = await vite.ssrLoadModule('/src/features/sesiones/services/tutorias-api.ts')
  filtros = await vite.ssrLoadModule('/src/features/sesiones/utils/filtros-tutorias.ts')
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/sesiones/pages/HistorialTutoriasPage.tsx'))
  ;({ default: PanelPage } = await vite.ssrLoadModule('/src/features/panel-tutee/pages/PanelTuteePage.tsx'))
  ;({ default: Detalle } = await vite.ssrLoadModule('/src/features/sesiones/pages/DetalleTutoriaPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  navegacion = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts')
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('consulta el historial por Gateway con JWT y paginación, sin usar el historial completo', async () => {
  globalThis.fetch = async (url, opciones) => {
    const ruta = new URL(url)
    assert.equal(ruta.pathname, '/api/agendamiento-sesiones/sessions/history/paginated')
    assert.deepEqual(Object.fromEntries(ruta.searchParams), { page: '1', limit: '10', rol: 'ESTUDIANTE', estado: 'COMPLETADA' })
    assert.equal(opciones.headers.Authorization, 'Bearer jwt-prueba')
    assert.equal(opciones.cache, 'no-store')
    return Response.json({ ...pagina, items: [{ ...tutoria, campoPrivado: 'oculto' }] })
  }
  assert.deepEqual(await api.consultarHistorialPaginado(sesion, seleccion), pagina)
})

test('acepta páginas vacías y páginas posteriores al último resultado', async () => {
  globalThis.fetch = async () => Response.json({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 })
  assert.deepEqual((await api.consultarHistorialPaginado(sesion, seleccion)).items, [])
  globalThis.fetch = async () => Response.json({ items: [], total: 1, page: 4, limit: 10, totalPages: 1 })
  assert.equal((await api.consultarHistorialPaginado(sesion, { ...seleccion, page: 4 })).total, 1)
})

test('rechaza totales inconsistentes, datos ajenos, duplicados y calificaciones inválidas', async () => {
  for (const datos of [null, [], { ...pagina, totalPages: 3 }, { ...pagina, total: -1 }, { ...pagina, page: 2 },
    { ...pagina, items: [] }, { ...pagina, items: [{ ...tutoria, id_tutee: '8' }] },
    { ...pagina, items: [{ ...tutoria, estado_sesion: 'CANCELADA' }] },
    { ...pagina, items: [{ ...tutoria, calificaciones: [{ ...tutoria.calificaciones[0], puntuacion: 9 }] }] },
    { ...pagina, items: [tutoria, tutoria], total: 2 }]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(api.consultarHistorialPaginado(sesion, seleccion), /leer el historial/)
  }
})

test('no consulta con una sesión vencida, identidad inválida o filtros inválidos', async () => {
  globalThis.fetch = () => assert.fail('No debe consultar')
  for (const cambio of [{ token: '' }, { expiraEn: 1 }, { idUsuario: 'abc' }]) {
    await assert.rejects(api.consultarHistorialPaginado({ ...sesion, ...cambio }, seleccion), (e) => e.tipo === 'sesion')
  }
  for (const cambio of [{ page: 0 }, { page: 1000001 }, { limit: 100 }, { rol: 'ADMINISTRADOR' }, { estado: 'OTRO' }]) {
    await assert.rejects(api.consultarHistorialPaginado(sesion, { ...seleccion, ...cambio }), /filtros/)
  }
  await assert.rejects(api.consultarDetalleTutoria(sesion, '9223372036854775808'), (e) => e.tipo === 'ausente')
})

test('distingue sesión, permisos, ausencia y errores del gateway sin mostrar respuestas privadas', async () => {
  for (const [estado, tipo] of [[401, 'sesion'], [403, 'permiso'], [404, 'ausente'], [500, 'consulta'], [502, 'consulta'], [504, 'consulta']]) {
    globalThis.fetch = async () => new Response('detalle-privado', { status: estado })
    await assert.rejects(api.consultarDetalleTutoria(sesion, tutoria.id_sesion), (e) => e.tipo === tipo && !e.message.includes('detalle-privado'))
  }
})

test('cancela peticiones al cambiar de pantalla y no reintenta automáticamente', async () => {
  let llamadas = 0
  const controlador = new AbortController()
  globalThis.fetch = (_url, opciones) => { llamadas++; return new Promise((_ok, fallo) => opciones.signal.addEventListener('abort', () => fallo(opciones.signal.reason), { once: true })) }
  const pendiente = api.consultarHistorialPaginado(sesion, seleccion, controlador.signal)
  controlador.abort()
  await assert.rejects(pendiente, { name: 'AbortError' })
  assert.equal(llamadas, 1)
})

test('consulta un detalle y conserva identificadores BIGINT como texto', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.ok(String(url).endsWith('/sessions/' + tutoria.id_sesion))
    assert.equal(opciones.headers.Authorization, 'Bearer jwt-prueba')
    return Response.json({ ...detalle, campoPrivado: 'no copiar', datos_encuentro: { ...detalle.datos_encuentro, secreto: 'no copiar' } })
  }
  assert.deepEqual(await api.consultarDetalleTutoria(sesion, tutoria.id_sesion), detalle)
})

test('rechaza detalles que no corresponden al ID o usuario, fechas imposibles y acciones malformadas', async () => {
  for (const cambio of [{ id_sesion: '7' }, { id_tutee: '8' }, { inicio: '2026-02-30T18:00:00.000Z' },
    { acciones_disponibles: { ...detalle.acciones_disponibles, aceptar: 'si' } }, { datos_encuentro: null },
    { declaraciones: [{ ...detalle.declaraciones[0], id_usuario: '99' }] }]) {
    globalThis.fetch = async () => Response.json({ ...detalle, ...cambio })
    await assert.rejects(api.consultarDetalleTutoria(sesion, tutoria.id_sesion), /leer el detalle/)
  }
})

test('permite la consulta administrativa de un detalle autorizado por el servidor', async () => {
  globalThis.fetch = async () => Response.json(detalle)
  assert.deepEqual(await api.consultarDetalleTutoria({ ...sesion, idUsuario: '99', roles: ['ADMINISTRADOR'] }, tutoria.id_sesion), detalle)
})

test('conserva filtros y página al codificar la búsqueda y normaliza URLs inválidas', () => {
  const entrada = { page: 3, limit: 20, rol: 'TUTOR', estado: 'PENDIENTE_CIERRE' }
  assert.deepEqual(filtros.leerFiltrosTutorias(filtros.parametrosTutorias(entrada)), entrada)
  assert.deepEqual(filtros.leerFiltrosTutorias(new URLSearchParams('page=-1&limit=900&rol=ADMINISTRADOR&estado=OTRO')), { page: 1, limit: 10, rol: '', estado: '' })
})

test('muestra sesiones, estado, calificación y acceso al detalle conservando los filtros', () => {
  const html = render(Page, basePage)
  assert.match(html, /Mi panel/)
  assert.match(html, /Historial de tutorías/)
  assert.match(html, /Programación III/)
  assert.match(html, /Con Camila/)
  assert.match(html, /Completada/)
  assert.match(html, /Tu calificación: 4 de 5/)
  assert.match(html, /href="\/panel\/tutorias\/9007199254740997\?page=1&amp;limit=10&amp;rol=ESTUDIANTE&amp;estado=COMPLETADA&amp;vista=historial"/)
  assert.equal((html.match(/<main\b/g) ?? []).length, 1)
  assert.doesNotMatch(html, /<header\b|<footer\b/)
})

test('presenta todos los estados finales y la participación del tutor con nombres alternativos', () => {
  for (const estado of ['CANCELADA', 'RECHAZADA', 'EXPIRADA', 'NO_REALIZADA', 'INASISTENCIA', 'EN_CONFLICTO']) {
    const html = render(Page, { ...basePage, idUsuario: '2', roles: ['ESTUDIANTE', 'TUTOR'], nombres: new Map(), consulta: { estado: 'listo', datos: { ...pagina, items: [{ ...tutoria, estado_sesion: estado }] } } })
    assert.match(html, /Como tutor/)
    assert.match(html, new RegExp(filtros.ETIQUETAS_SESION[estado]))
    assert.match(html, /estudiante #9007199254740993/)
  }
})

test('muestra carga, vacío y recuperación sin confundir errores con una lista vacía', () => {
  assert.match(render(Page, { ...basePage, consulta: { estado: 'cargando' } }), /Cargando tus tutorías/)
  const vacio = render(Page, { ...basePage, consulta: { estado: 'listo', datos: { ...pagina, items: [], total: 0, totalPages: 0 } } })
  assert.match(vacio, /No hay tutorías para esta selección/)
  const fallo = render(Page, { ...basePage, consulta: { estado: 'error', tipo: 'consulta', mensaje: 'Servicio no disponible' } })
  assert.match(fallo, /role="alert"/)
  assert.match(fallo, /Reintentar/)
  assert.doesNotMatch(fallo, /No hay tutorías para esta selección/)
  const sinAcceso = render(Detalle, { ...baseDetalle, consulta: { estado: 'error', tipo: 'permiso', mensaje: 'Sin acceso' } })
  assert.doesNotMatch(sinAcceso, /Programación III|Abrir reunión|Reintentar/)
})

test('el detalle muestra encuentro, declaraciones, calificaciones y el retorno al historial', () => {
  const html = render(Detalle, baseDetalle)
  assert.match(html, /En línea/)
  assert.match(html, /href="https:\/\/meet.example.test\/tutoria"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
  assert.match(html, /Cierre de la sesión/)
  assert.match(html, /Tu calificación a Camila/)
  assert.match(html, /4 de 5/)
  assert.match(html, /href="\/panel\?page=2&amp;limit=10&amp;estado=COMPLETADA&amp;vista=historial"/)
})

test('los encuentros sin definir y los resultados provisionales se presentan explícitamente', () => {
  const html = render(Detalle, { ...baseDetalle, consulta: { estado: 'listo', datos: { ...detalle,
    resultado_provisional: true, datos_encuentro: { modalidad: null, lugar: null, enlace: null },
  } } })
  assert.match(html, /resultado es provisional/)
  assert.equal((html.match(/Por definir/g) ?? []).length, 3)
})

test('no crea enlaces ejecutables ni interpreta el texto de participantes como HTML', () => {
  for (const enlace of ['javascript:alert(1)', 'data:text/html,algo', '//otro.test', 'https://usuario:clave@example.test']) {
    assert.equal(filtros.enlaceEncuentroSeguro(enlace), undefined)
    const html = render(Detalle, { ...baseDetalle, nombres: new Map([['2', '<script>alert(1)</script>']]), consulta: { estado: 'listo', datos: { ...detalle, datos_encuentro: { ...detalle.datos_encuentro, enlace } } } })
    assert.doesNotMatch(html, /href="javascript:|href="data:|<script>/)
    assert.match(html, /&lt;script&gt;/)
  }
})

test('unifica el acceso en Mi panel para ambos roles sin el enlace duplicado', () => {
  for (const rol of ['ESTUDIANTE', 'TUTOR']) {
    const enlaces = navegacion.obtenerNavegacion([rol])
    assert.equal(enlaces.filter((enlace) => enlace.etiqueta === 'Mi panel').length, 1)
    assert.ok(!enlaces.some((enlace) => enlace.destino === '/mis-tutorias'))
  }
  assert.ok(navegacion.obtenerNavegacion(['ESTUDIANTE']).some((enlace) => enlace.destino === '/panel'))
  assert.ok(navegacion.obtenerNavegacion(['TUTOR']).some((enlace) => enlace.destino === '/solicitudes/recibidas'))
})

test('una cuenta solo estudiante no muestra el selector de participación ni opciones de tutor', () => {
  const html = render(Page, basePage)
  assert.doesNotMatch(html, /Participación|Como tutor|Todas mis participaciones/)
  assert.doesNotMatch(html, /tutorias__participacion/)
  assert.match(html, /Programación III/)
})

test('el selector de participación aparece únicamente cuando la cuenta tiene ambos roles', () => {
  const dual = render(Page, { ...basePage, roles: ['ESTUDIANTE', 'TUTOR'] })
  assert.match(dual, /Participación/)
  assert.match(dual, /Como tutor/)
  assert.match(dual, /Como estudiante/)
  const tutor = render(Page, { ...basePage, roles: ['TUTOR'], idUsuario: '2', filtros: { ...seleccion, rol: 'TUTOR' } })
  assert.doesNotMatch(tutor, /Participación|Todas mis participaciones/)
})

test('la participación única se aplica a la consulta aunque la URL pida el otro rol', () => {
  const adaptados = filtros.filtrosTutoriasDelUsuario(new URLSearchParams('rol=TUTOR&page=3&estado=COMPLETADA'), ['ESTUDIANTE'])
  assert.deepEqual(adaptados, { page: 1, limit: 10, rol: 'ESTUDIANTE', estado: 'COMPLETADA' })
  assert.equal(filtros.filtrosTutoriasDelUsuario(new URLSearchParams('page=2'), ['ESTUDIANTE']).page, 2)
  assert.equal(filtros.filtrosTutoriasDelUsuario(new URLSearchParams(), ['TUTOR']).rol, 'TUTOR')
  assert.equal(filtros.filtrosTutoriasDelUsuario(new URLSearchParams(), ['ESTUDIANTE', 'TUTOR']).rol, '')
})

test('las rutas del listado y detalle exigen sesión antes de mostrar datos', async () => {
  for (const ruta of ['/panel', '/panel?vista=historial', '/panel/tutorias/9007199254740997', '/mis-tutorias', '/mis-tutorias/9007199254740997']) {
    const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(AppRoutes)))
    assert.match(html, /Redirigiendo al inicio de sesión/)
    assert.doesNotMatch(html, /datos-encuentro-titulo/)
  }
})

test('Mi panel abre las activas por defecto y permite entrar al historial sin montar ambas consultas', () => {
  const html = render(PanelPage, { sesiones: createElement('p', null, 'Activas originales con cancelación'),
    historial: createElement('p', null, 'Historial completo'),
  })
  assert.match(html, /Activas originales con cancelación/)
  assert.doesNotMatch(html, /Historial completo/)
  assert.match(html, /<a\b(?=[^>]*href="\/panel")(?=[^>]*aria-current="page")[^>]*>/)
  assert.match(html, /href="\/panel\?vista=historial"/)
  const historial = render(PanelPage, { vista: 'historial', sesiones: createElement('p', null, 'Activas originales con cancelación'),
    historial: createElement('p', null, 'Historial completo'),
  })
  assert.match(historial, /Historial completo/)
  assert.doesNotMatch(historial, /Activas originales con cancelación/)
})

test('el historial integrado tiene un solo encabezado y no repite las pestañas de estado', () => {
  const html = render(Page, basePage)
  assert.equal((html.match(/<main\b/g) ?? []).length, 1)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.doesNotMatch(html, /Filtrar tutorías por estado/)
  assert.match(html, /Historial de tutorías/)
})

test('la URL conserva la vista de historial al filtrar, paginar o volver del detalle', () => {
  const parametros = filtros.parametrosHistorialPanel({ ...seleccion, page: 3 })
  assert.equal(parametros.get('vista'), 'historial')
  assert.equal(filtros.vistaPanel(parametros, ['ESTUDIANTE']), 'historial')
  assert.equal(filtros.vistaPanel(new URLSearchParams(), ['ESTUDIANTE']), 'activas')
  assert.equal(filtros.vistaPanel(new URLSearchParams(), ['ESTUDIANTE', 'TUTOR']), 'activas')
  assert.equal(filtros.vistaPanel(new URLSearchParams(), ['TUTOR']), 'historial')
  const volver = new URL(filtros.regresoPanel(parametros, ['ESTUDIANTE']), 'http://localhost')
  assert.equal(volver.pathname, '/panel')
  assert.equal(volver.searchParams.get('page'), '3')
  assert.equal(volver.searchParams.get('vista'), 'historial')
  assert.equal(filtros.regresoPanel(new URLSearchParams('vista=activas'), ['ESTUDIANTE']), '/panel')
})

test('los enlaces anteriores conservan el ID, filtros, página y ancla al unificarse en Mi panel', () => {
  const anterior = '?page=3&limit=20&rol=TUTOR&estado=COMPLETADA'
  const detalle = filtros.destinoTutoriasAnterior('9007199254740997', anterior, '#calificaciones-titulo')
  assert.equal(detalle.pathname, '/panel/tutorias/9007199254740997')
  assert.equal(detalle.hash, '#calificaciones-titulo')
  const consulta = new URLSearchParams(detalle.search)
  assert.equal(consulta.get('vista'), 'historial')
  assert.equal(consulta.get('page'), '3')
  assert.equal(consulta.get('rol'), 'TUTOR')
  assert.equal(consulta.get('estado'), 'COMPLETADA')
  assert.equal(filtros.destinoTutoriasAnterior(undefined, anterior, '').pathname, '/panel')
})
