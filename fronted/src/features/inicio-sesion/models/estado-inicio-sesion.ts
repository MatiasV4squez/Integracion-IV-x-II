export const MENSAJES_RESULTADO_INICIO_SESION = {
  invalido: {
    titulo: 'No pudimos validar tus datos',
    detalle: 'Revisa el correo y la contraseña ingresados e inténtalo nuevamente.',
  },
  credenciales: {
    titulo: 'Correo o contraseña incorrectos',
    detalle: 'Revisa tus datos e inténtalo nuevamente.',
  },
  suspendida: {
    titulo: 'Tu cuenta está suspendida',
    detalle: 'Comunícate con la administración de la plataforma para más información.',
  },
  pendiente: {
    titulo: 'Debes verificar tu correo antes de iniciar sesión',
    detalle: 'Abre el enlace enviado a tu correo institucional. Si necesitas otro, puedes solicitarlo en la pantalla de verificación.',
  },
  inactiva: {
    titulo: 'Tu cuenta aún no está activa',
    detalle: 'Comunícate con la administración de la plataforma para revisar el estado de tu cuenta.',
  },
  error: {
    titulo: 'No pudimos iniciar sesión',
    detalle: 'Ocurrió un problema al procesar tu solicitud. Inténtalo más tarde.',
  },
}

export type ResultadoInicioSesionFallido = keyof typeof MENSAJES_RESULTADO_INICIO_SESION
export type EstadoEnvioInicioSesion = 'inactivo' | 'enviando' | ResultadoInicioSesionFallido
