// Evita mostrar mensajes técnicos del navegador cuando falla la conexión con la API.
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'El servidor tardó demasiado en responder. Inténtalo nuevamente.'
  }
  if (error instanceof TypeError) return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
  return error instanceof Error && error.message.trim() ? error.message : porDefecto
}
