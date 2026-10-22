import { renderToReadableStream } from 'react-dom/server'

// Espera modulos diferidos para comprobar el contenido real de las rutas.
export async function renderizarRuta(elemento) {
  const flujo = await renderToReadableStream(elemento)
  await flujo.allReady
  return new Response(flujo).text()
}
