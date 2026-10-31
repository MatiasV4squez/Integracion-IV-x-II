// Solo acepta rutas internas para no redirigir a otro sitio después del login.
export function leerDestinoSolicitado(estado: unknown): string | undefined {
  if (!estado || typeof estado !== 'object' || !('desde' in estado) || typeof estado.desde !== 'string') return undefined
  const { desde } = estado
  return desde.startsWith('/') && !desde.startsWith('//') && !desde.startsWith('/\\') && !/^\/login(?:[/?#]|$)/.test(desde)
    ? desde : undefined
}
