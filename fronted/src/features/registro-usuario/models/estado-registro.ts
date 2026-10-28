export const MENSAJES_RESULTADO_REGISTRO = {
  exitoso: {
    titulo: '¡Cuenta creada!',
    detalle: 'Revisa tu correo institucional y abre el enlace de verificación para activar tu cuenta.',
  },
  invalido: {
    titulo: 'No pudimos crear tu cuenta',
    detalle: 'Revisa los datos ingresados e inténtalo nuevamente.',
  },
  duplicado: {
    titulo: 'El correo institucional ya está registrado',
    detalle: 'Inicia sesión con tu cuenta o solicita un nuevo enlace de verificación.',
  },
  error: {
    titulo: 'No pudimos completar el registro',
    detalle: 'Ocurrió un problema al procesar tu solicitud. Inténtalo más tarde.',
  },
}

export type ResultadoRegistro = keyof typeof MENSAJES_RESULTADO_REGISTRO
export type EstadoEnvioRegistro = 'inactivo' | 'enviando' | ResultadoRegistro
