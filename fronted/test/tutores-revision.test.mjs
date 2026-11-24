import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, consultarTutoresEnRevision
let TutoresRevisionAdminPage, TutoresRevisionAdminContainer, AppRoutes, obtenerNavegacion
const fetchOriginal = globalThis.fetch
const urlBase = () => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '')

const administrador = { token: 'token-administrador-de-prueba', idUsuario: '9007199254740993', roles: ['ADMINISTRADOR'], expiraEn: Date.now() + 3600000 }
const tutorEnRevision = { idTutor: '42', cantidadCalificaciones: 3, promedio: 2.3333333333333335, estado: 'EN_REVISION' }
const otroTutor = { idTutor: '43', cantidadCalificaciones: 5, promedio: 1.8, estado: 'EN_REVISION' }
const acciones = { onRecargar() {} }
const pagina = (consulta, extras = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(TutoresRevisionAdminPage, { consulta, ...acciones, ...extras })))

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarTutoresEnRevision } = await vite.ssrLoadModule('/src/features/tutores-revision/index.ts'))
  ;({ default: TutoresRevisionAdminPage } = await vite.ssrLoadModule('/src/features/tutores-revision/pages/TutoresRevisionAdminPage.tsx'))
  ;({ default: TutoresRevisionAdminContainer } = await vite.ssrLoadModule('/src/features/tutores-revision/containers/TutoresRevisionAdminContainer.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ obtenerNavegacion } = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('consulta los tutores en revisión por el Gateway con Bearer y sin caché', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: String(url), opciones }
    return Response.json([{ ...tutorEnRevision, campoInterno: 'x' }])
  }
  const resultado = await consultarTutoresEnRevision(administrador)
  assert.equal(llamada.url, urlBase() + '/materias-tutores/tutores/en-revision')
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer ' + administrador.token)
  assert.equal(llamada.opciones.headers.Accept, 'application/json')
  assert.equal(llamada.opciones.cache, 'no-store')
  assert.ok(llamada.opciones.signal instanceof AbortSignal)
  assert.deepEqual(resultado, [tutorEnRevision])
})

test('exige sesión y rol administrador antes de consultar', async () => {
  globalThis.fetch = () => assert.fail('No debe consultar sin acceso')
  for (const sesion of [null, undefined, { ...administrador, token: '' }, { ...administrador, expiraEn: 1 }, { ...administrador, idUsuario: '0' }]) {
    await assert.rejects(consultarTutoresEnRevision(sesion), (error) => error.tipo === 'sesion')
  }
  for (const roles of [[], ['TUTOR'], ['ESTUDIANTE'], null]) {
    await assert.rejects(consultarTutoresEnRevision({ ...administrador, roles }), (error) => error.tipo === 'permiso')
  }
  globalThis.fetch = async () => Response.json([])
  for (const roles of [['ADMIN'], [' administrador '], ['TUTOR', 'admin']]) {
    assert.deepEqual(await consultarTutoresEnRevision({ ...administrador, roles }), [])
  }
})

test('rechaza listados malformados sin convertirlos en una lista vacía', async () => {
  for (const datos of [null, {}, 'texto',
    [{ ...tutorEnRevision, idTutor: '0' }],
    [{ ...tutorEnRevision, estado: 'ACTIVO' }],
    [{ ...tutorEnRevision, estado: 'OTRO' }],
    [{ ...tutorEnRevision, promedio: 6 }],
    [{ ...tutorEnRevision, promedio: '2.3' }],
    [{ ...tutorEnRevision, cantidadCalificaciones: -1 }],
    [{ ...tutorEnRevision, cantidadCalificaciones: 1.5 }],
    [tutorEnRevision, tutorEnRevision],
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarTutoresEnRevision(administrador), /no válidos/)
  }
})

test('clasifica los errores HTTP de la consulta sin filtrar cuerpos internos', async () => {
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 401 })
  await assert.rejects(consultarTutoresEnRevision(administrador), (error) => error.tipo === 'sesion')
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 403 })
  await assert.rejects(consultarTutoresEnRevision(administrador), (error) => error.tipo === 'permiso')
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 504 })
  await assert.rejects(consultarTutoresEnRevision(administrador), (error) => error.tipo === 'consulta' && /tardó demasiado/.test(error.message))
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 500 })
  await assert.rejects(consultarTutoresEnRevision(administrador), (error) => {
    assert.equal(error.tipo, 'consulta')
    assert.doesNotMatch(error.message, /detalle-interno-privado/)
    return true
  })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(consultarTutoresEnRevision(administrador), /No pudimos conectar con el servidor/)
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(consultarTutoresEnRevision(administrador), /No pudimos leer la lista/)
})

test('cancela la consulta con una señal ya cancelada', async () => {
  globalThis.fetch = () => assert.fail('Una señal cancelada no debe consultar')
  const cancelado = new AbortController()
  cancelado.abort()
  await assert.rejects(consultarTutoresEnRevision(administrador, cancelado.signal), { name: 'AbortError' })
})

test('muestra los tutores en revisión con su reputación y enlace al perfil', () => {
  const html = pagina({ estado: 'listo', tutores: [tutorEnRevision, otroTutor] }, { nombres: new Map([['42', 'Camila Rojas']]) })
  assert.match(html, /Tutores en revisión/)
  assert.match(html, /2 tutores/)
  assert.match(html, /Camila Rojas/)
  assert.match(html, /Usuario #43/)
  assert.match(html, /En revisión/)
  assert.match(html, /2,3 de 5/)
  assert.match(html, /<dd>3<\/dd>/)
  assert.match(html, /href="\/tutores\/42"/)
  assert.match(html, /href="\/tutores\/43"/)
  assert.match(html, /Ver perfil del tutor/)
})

test('diferencia carga, error con reintento y listado vacío', () => {
  const carga = pagina({ estado: 'cargando' })
  assert.match(carga, /Cargando tutores en revisión/)
  assert.doesNotMatch(carga, /No hay tutores en revisión/)
  const error = pagina({ estado: 'error', mensaje: 'No pudimos conectar.', tipo: 'consulta' })
  assert.match(error, /role="alert"[^>]*>No pudimos conectar\./)
  assert.match(error, /Reintentar consulta/)
  assert.doesNotMatch(error, /No hay tutores en revisión|Cargando tutores en revisión/)
  assert.match(pagina({ estado: 'listo', tutores: [] }), /No hay tutores en revisión/)
})

test('sin sesión y sin permiso no expone el listado ni los perfiles', () => {
  const sinSesion = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(TutoresRevisionAdminContainer)))
  assert.match(sinSesion, /Debes iniciar sesión con una cuenta de administrador/)
  assert.match(sinSesion, /href="\/login"/)
  const sinPermiso = pagina({ estado: 'listo', tutores: [tutorEnRevision] }, { acceso: 'permiso' })
  assert.match(sinPermiso, /No tienes permisos para consultar esta sección/)
  assert.match(sinPermiso, /href="\/materias"/)
  for (const html of [sinSesion, sinPermiso]) {
    assert.doesNotMatch(html, /Actualizar listado|Ver perfil del tutor|En revisión/)
  }
})

test('la ruta administrativa exige sesión y el menú la enlaza solo para administradores', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/administracion/tutores-revision'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión…/)
  assert.doesNotMatch(html, /Tutores en revisión/)
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1)
  for (const roles of [['ADMIN'], ['ADMINISTRADOR'], ['TUTOR', 'ADMIN']]) {
    assert.ok(obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/tutores-revision'))
  }
  for (const roles of [[], ['ESTUDIANTE'], ['TUTOR']]) {
    assert.ok(!obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/tutores-revision'))
  }
})
