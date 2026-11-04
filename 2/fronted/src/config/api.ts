export function obtenerUrlApi(ruta: string): string {
  const configurada = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!configurada) {
    throw new Error('Falta configurar VITE_API_BASE_URL con la dirección de la API Gateway.')
  }

  const base = new URL(configurada)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('VITE_API_BASE_URL debe ser una URL base HTTP(S), sin credenciales, consulta ni fragmento.')
  }

  return base.toString().replace(/\/+$/, '') + '/' + ruta.replace(/^\/+/, '')
}
