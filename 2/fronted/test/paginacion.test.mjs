import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let vite, Paginacion
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ Paginacion } = await vite.ssrLoadModule('/src/shared/components/Paginacion.tsx'))
})
after(async () => { await vite?.close() })

const render = (props = {}) => renderToStaticMarkup(createElement(Paginacion, {
  page: 1, totalPages: 3, onCambiarPagina() {}, ...props,
}))
const botones = (html) => html.match(/<button\b[^>]*>/g) ?? []

test('los límites deshabilitan únicamente la dirección que no tiene otra página', () => {
  const primera = botones(render())
  assert.match(primera[0], /disabled/)
  assert.doesNotMatch(primera[1], /disabled/)
  const ultima = botones(render({ page: 3 }))
  assert.doesNotMatch(ultima[0], /disabled/)
  assert.match(ultima[1], /disabled/)
  const intermedia = render({ page: 2 })
  assert.doesNotMatch(intermedia, /disabled/)
  assert.match(intermedia, /Página 2 de 3/)
})

test('se oculta sin páginas adicionales y ante posiciones o totales inválidos', () => {
  for (const props of [{ totalPages: 0 }, { totalPages: 1 }, { totalPages: -1 },
    { page: 0 }, { page: -1 }, { page: 4 }, { page: 1.5 }, { totalPages: 2.5 },
    { page: NaN }, { totalPages: Infinity }, { totalPages: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(render(props), '', JSON.stringify(props))
  }
})

test('permite bloquear ambos controles y diferenciar listados mediante su etiqueta accesible', () => {
  const html = render({ etiqueta: 'Páginas de postulaciones', deshabilitada: true })
  assert.match(html, /aria-label="Páginas de postulaciones"/)
  assert.equal(botones(html).filter((boton) => boton.includes('disabled')).length, 2)
  assert.equal(botones(html).filter((boton) => boton.includes('type="button"')).length, 2)
  assert.match(html, /aria-live="polite" aria-atomic="true"/)
})
