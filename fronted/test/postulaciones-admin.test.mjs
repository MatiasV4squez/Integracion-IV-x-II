import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, PostulacionesAdminPage, PostulacionesAdminContainer, AppRoutes, obtenerNavegacion
const postulacion = {
  idPostulacion: '17', idUsuario: '23', idMateria: '1', certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf',
  estado: 'PENDIENTE_ROL', fechaPostulacion: '2026-10-21T15:00:00.000Z', fechaRevision: '2026-10-22T15:00:00.000Z',
  notaAcreditada: 5.5, motivoRechazo: null, idAdministradorRevision: '10',
}
const acciones = { onRecargar: () => {}, onSeleccionar: () => {}, onDescargar: () => {} }
const pagina = (consulta, extras = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(PostulacionesAdminPage, { consulta, ...acciones, ...extras })))

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ default: PostulacionesAdminPage } = await vite.ssrLoadModule('/src/features/postulaciones/pages/PostulacionesAdminPage.tsx'))
  ;({ default: PostulacionesAdminContainer } = await vite.ssrLoadModule('/src/features/postulaciones/containers/PostulacionesAdminContainer.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ obtenerNavegacion } = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts'))
})
after(async () => { await vite?.close() })

test('sin sesión y sin permiso oculta el listado, los certificados y las acciones administrativas', () => {
  const sinSesion = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PostulacionesAdminContainer)))
  assert.match(sinSesion, /Debes iniciar sesión con una cuenta de administrador/)
  assert.match(sinSesion, /href="\/login"/)
  const sinPermiso = pagina({ estado: 'listo', postulaciones: [postulacion] }, { acceso: 'permiso', seleccionada: '17' })
  assert.match(sinPermiso, /No tienes permisos/)
  for (const html of [sinSesion, sinPermiso]) assert.doesNotMatch(html, /Descargar certificado|Ver detalles|Actualizar listado|notas.pdf/)
})

test('diferencia carga, error con reintento y lista vacía sin mezclar sus mensajes', () => {
  const carga = pagina({ estado: 'cargando' })
  assert.match(carga, /role="status"/)
  assert.match(carga, /Cargando postulaciones/)
  assert.doesNotMatch(carga, /No hay postulaciones/)
  const error = pagina({ estado: 'error', mensaje: 'No pudimos conectar.' })
  assert.match(error, /role="alert"/)
  assert.match(error, /Reintentar consulta/)
  assert.doesNotMatch(error, /No hay postulaciones/)
  assert.match(pagina({ estado: 'listo', postulaciones: [] }), /No hay postulaciones pendientes/)
})

test('presenta el detalle de PENDIENTE_ROL, incluida la nota y la revisión registrada', () => {
  const html = pagina({ estado: 'listo', postulaciones: [postulacion] }, { seleccionada: '17' })
  for (const texto of ['Pendiente de asignación de rol', 'Detalle de postulación #17', 'notas.pdf', 'application/pdf', '5.5', 'Administrador revisor', 'Descargar certificado']) {
    assert.ok(html.includes(texto), texto)
  }
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-controls="post-admin-detalle"/)
})

test('bloquea la descarga en curso y muestra su error sin inventar un detalle inexistente', () => {
  const html = pagina({ estado: 'listo', postulaciones: [postulacion] }, { seleccionada: '17', descargando: true })
  assert.match(html, /disabled="">Descargando/)
  assert.match(pagina({ estado: 'listo', postulaciones: [postulacion] }, { seleccionada: '17', errorCertificado: 'Certificado no disponible.' }), /Certificado no disponible/)
  assert.doesNotMatch(pagina({ estado: 'listo', postulaciones: [postulacion] }, { seleccionada: '99' }), /Descargar certificado/)
})

test('integra la ruta administrativa con carga diferida, conservando un encabezado y un pie', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/administracion/postulaciones'] }, createElement(AppRoutes)))
  assert.match(html, /Administrar postulaciones/)
  assert.match(html, /Debes iniciar sesión/)
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1)
})

test('el menú administrativo enlaza al panel sin cambiar el menú de estudiantes y tutores', () => {
  for (const roles of [['ADMIN'], ['ADMINISTRADOR'], ['TUTOR', 'ADMIN']]) {
    assert.ok(obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/postulaciones'))
  }
  for (const roles of [[], ['ESTUDIANTE'], ['TUTOR']]) {
    assert.ok(!obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/postulaciones'))
  }
})
