import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let vite, PaginacionTutores
const renderizar = (props) => renderToStaticMarkup(createElement(PaginacionTutores, { onCambiarPagina: () => {}, ...props }))

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ PaginacionTutores } = await vite.ssrLoadModule('/src/features/tutores/components/PaginacionTutores.tsx'))
})
after(async () => { await vite?.close() })

test('los controles de tutores conservan el bloqueo del componente compartido', () => {
  const html = renderizar({ page: 2, totalPages: 3, deshabilitada: true })
  assert.match(html, /Páginas de tutores/)
  assert.equal((html.match(/disabled=/g) ?? []).length, 2)
})

test('respeta primera y última página y oculta controles cuando no corresponden', () => {
  assert.match(renderizar({ page: 1, totalPages: 3 }), /disabled="">Anterior/)
  assert.match(renderizar({ page: 3, totalPages: 3 }), /disabled="">Siguiente/)
  for (const props of [{ page: 0, totalPages: 3 }, { page: 4, totalPages: 3 }, { page: 1, totalPages: 1 }, { page: NaN, totalPages: 3 }]) {
    assert.equal(renderizar(props), '')
  }
})
