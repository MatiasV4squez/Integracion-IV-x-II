import { normalizarCorreo, validarCorreo } from '../../../shared/utils/validaciones-formulario'

export const MENSAJES_VERIFICACION = {
  registrada: {
    titulo: 'Cuenta creada. Verifica tu correo',
    detalle: 'Revisa tu correo institucional y abre el enlace para activar tu cuenta. Debes verificarlo antes de iniciar sesión.',
  },
  envio_pendiente: {
    titulo: 'Tu cuenta fue creada, pero falta enviar el enlace',
    detalle: 'No pudimos enviar el enlace de verificación. Solicita uno nuevo para activar tu cuenta; no necesitas registrarte otra vez.',
  },
  pendiente: {
    titulo: 'Verifica tu correo',
    detalle: 'Para completar tu registro, abre el enlace de verificación que recibiste en tu correo institucional.',
  },
  verificando: {
    titulo: 'Verificando tu cuenta',
    detalle: 'Espera a que termine la verificación antes de continuar.',
  },
  verificada: {
    titulo: '¡Tu correo está verificado!',
    detalle: 'Inicia sesión con tu correo institucional. Si tu cuenta está suspendida, comunícate con la administración.',
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

// El contexto solo precarga el formulario y los avisos; no acredita una verificación.
export function leerContextoVerificacion(valor: unknown) {
  const contexto = valor && typeof valor === 'object' ? valor : {}
  const correo = 'correo' in contexto && typeof contexto.correo === 'string' && !validarCorreo(contexto.correo)
    ? normalizarCorreo(contexto.correo) : ''
  const verificacion = 'verificacion' in contexto ? contexto.verificacion : undefined
  const estado: EstadoVerificacion = verificacion === 'PENDIENTE_ENVIO' ? 'envio_pendiente'
    : verificacion === 'ENLACE_GENERADO' ? 'registrada' : 'pendiente'
  return { correo, estado }
}

// Las vistas solo permiten revisar la presentación: nunca verifican tokens ni cuentas.
export function leerVistaVerificacion(valor: string | null, permitirDemostracion: boolean): EstadoVerificacion {
  return permitirDemostracion && valor !== null && Object.hasOwn(MENSAJES_VERIFICACION, valor)
    ? valor as EstadoVerificacion : 'pendiente'
}
