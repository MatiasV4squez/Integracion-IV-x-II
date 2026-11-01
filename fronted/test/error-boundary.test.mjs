import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, ErrorBoundary, ErrorRenderFallback

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ ErrorBoundary, ErrorRenderFallback } = await server.ssrLoadModule('/src/shared/components/ErrorBoundary.tsx'))
})

after(async () => { await server?.close() })

test('muestra el contenido protegido mientras no haya errores de renderizado', () => {
  const html = renderToStaticMarkup(createElement(ErrorBoundary, null,
    createElement('p', null, 'Contenido visible')))
  assert.match(html, /Contenido visible/)
  assert.doesNotMatch(html, /Algo falló/)
})

test('la alternativa de recuperación ofrece reintentar, recargar y volver al inicio', () => {
  const html = renderToStaticMarkup(createElement(ErrorRenderFallback, { onReintentar() {} }))
  assert.match(html, /Algo falló en esta página/)
  assert.match(html, /role="alert"/)
  assert.match(html, />Reintentar<\/button>/)
  assert.match(html, /Recargar la página/)
  assert.match(html, /href="\/"/)
  assert.match(html, /Volver al inicio/)
})

test('no expone detalles internos del error en la alternativa', () => {
  const html = renderToStaticMarkup(createElement(ErrorRenderFallback, { onReintentar() {} }))
  assert.doesNotMatch(html, /stack|componentStack|boom/i)
})

test('sin reintento disponible conserva recargar y volver al inicio', () => {
  const html = renderToStaticMarkup(createElement(ErrorRenderFallback, {}))
  assert.doesNotMatch(html, />Reintentar<\/button>/)
  assert.match(html, /Recargar la página/)
  assert.match(html, /Volver al inicio/)
})

test('getDerivedStateFromError registra el fallo y el estado inicial no lo presenta', () => {
  const fallo = new Error('boom')
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(fallo), { error: fallo })
  assert.deepEqual(new ErrorBoundary({ children: null }).state, { error: null })
})

test('con un fallo registrado muestra la alternativa y reintentar limpia el error', () => {
  const limite = new ErrorBoundary({ children: createElement('p', null, 'Contenido visible') })
  limite.state = { error: new Error('boom') }

  const html = renderToStaticMarkup(limite.render())
  assert.match(html, /Algo falló en esta página/)
  assert.doesNotMatch(html, /Contenido visible|boom/)

  let nuevoEstado
  limite.setState = (estado) => { nuevoEstado = estado }
  limite.render().props.onReintentar()
  assert.deepEqual(nuevoEstado, { error: null })
})
