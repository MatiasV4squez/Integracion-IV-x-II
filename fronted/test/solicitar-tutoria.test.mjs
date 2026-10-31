import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let server, EstadoSolicitarTutoria, SolicitarTutoriaPage, AppRoutes
const fetchOriginal = globalThis.fetch

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ EstadoSolicitarTutoria } = await server.ssrLoadModule('/src/features/sesiones/components/EstadoSolicitarTutoria.tsx'))
  ;({ default: SolicitarTutoriaPage } = await server.ssrLoadModule('/src/features/sesiones/pages/SolicitarTutoriaPage.tsx'))
  ;({ AppRoutes } = await server.ssrLoadModule('/src/app/AppRoutes.tsx'))
})

afterEach(() => { globalThis.fetch = fetchOriginal })

after(async () => { await server?.close() })

test('presenta los estados de acceso y de materia pendiente con sus destinos', () => {
  const estado = (cambios) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(EstadoSolicitarTutoria, cambios)))

  const sesion = estado({ estado: 'sesion' })
  assert.match(sesion, /Inicia sesión para solicitar una tutoría/)
  assert.match(sesion, /role="status"/)
  assert.match(sesion, /href="\/login"/)

  const permiso = estado({ estado: 'permiso' })
  assert.match(permiso, /Esta sección es para estudiantes/)
  assert.match(permiso, /role="alert"/)

  const materia = estado({ estado: 'materia' })
  assert.match(materia, /Selecciona una materia/)
  assert.match(materia, /href="\/materias"/)
  assert.match(materia, /href="\/tutores"/)
})

test('la página muestra la materia resuelta o su identificador cuando el catálogo no está disponible', () => {
  const pagina = (nombreMateria) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(SolicitarTutoriaPage, {
      idMateria: '5', nombreMateria, tutores: [], seleccion: null, cargando: false,
      errorCarga: null, enviando: false, error: null, sesionCreada: null,
      alSeleccionar() {}, alEnviar() {},
    })))

  assert.match(pagina('Álgebra lineal'), /Álgebra lineal/)
  assert.match(pagina('Materia #5'), /Materia #5/)
})

test('la ruta de solicitud ya no hardcodea materia y exige una sesión real antes de consultar la API', async () => {
  globalThis.fetch = () => {
    assert.fail('Sin una sesión válida no debe consultar la API')
  }

  for (const path of ['/solicitudes/nueva', '/solicitudes/nueva?materiaId=1', '/solicitudes/nueva?materiaId=abc']) {
    const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes)))
    assert.doesNotMatch(html, /Cálculo intermedio/)
    assert.match(html, /Inicia sesión para solicitar una tutoría/)
    assert.match(html, /href="\/login"/)
  }
})
