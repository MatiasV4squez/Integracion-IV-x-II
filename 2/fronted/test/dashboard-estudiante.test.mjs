import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let server, DashboardEstudiantePage

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ default: DashboardEstudiantePage } = await server.ssrLoadModule('/src/features/estudiantes/pages/DashboardEstudiantePage.tsx'))
})

after(async () => { await server?.close() })

test('"Solicitar tutoría" del inicio lleva a Buscar tutores y no al selector de materias antiguo', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(DashboardEstudiantePage, { nombreEstudiante: 'Renato' })))
  assert.match(html, /href="\/tutores"[^>]*>Solicitar tutoría/)
  assert.doesNotMatch(html, /href="\/solicitudes\/nueva"/)
})
