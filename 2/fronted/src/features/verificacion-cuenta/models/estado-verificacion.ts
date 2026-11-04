export const MENSAJES_VERIFICACION = {
  pendiente: {
    titulo: 'Verifica tu correo',
    detalle: 'Para completar tu registro, abre el enlace de verificación que recibiste en tu correo institucional.',
  },
  verificando: {
    titulo: 'Verificando tu cuenta',
    detalle: 'Espera a que termine la verificación antes de continuar.',
  },
  verificada: {
    titulo: '¡Tu cuenta está verificada!',
    detalle: 'Inicia sesión con tu correo institucional para acceder a la plataforma.',
  },
  vencida: {
    titulo: 'El enlace ha vencido',
    detalle: 'El enlace de verificación ya no está vigente. Necesitas uno nuevo para continuar.',
  },
  invalida: {
    titulo: 'Enlace no válido',
    detalle: 'Comprueba que abriste el enlace completo desde tu correo institucional.',
  },
  utilizada: {
    titulo: 'Este enlace ya no está disponible',
    detalle: 'El enlace ya fue utilizado o el correo ya está verificado. Prueba iniciar sesión o solicita otro enlace.',
  },
  error: {
    titulo: 'No pudimos verificar tu cuenta',
    detalle: 'No pudimos confirmar el resultado. Puedes volver a intentarlo o probar iniciar sesión si ya verificaste el correo.',
  },
}

export type EstadoVerificacion = keyof typeof MENSAJES_VERIFICACION
export const ESTADOS_VERIFICACION = Object.keys(MENSAJES_VERIFICACION) as EstadoVerificacion[]

// Las vistas solo permiten revisar la presentación: nunca verifican tokens ni cuentas.
export function leerVistaVerificacion(valor: string | null, permitirDemostracion: boolean): EstadoVerificacion {
  return permitirDemostracion && valor !== null && Object.hasOwn(MENSAJES_VERIFICACION, valor)
    ? valor as EstadoVerificacion : 'pendiente'
}
