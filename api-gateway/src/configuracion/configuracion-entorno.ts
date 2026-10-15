const DIRECCIONES_SERVICIOS = [
  'USUARIOS_AUTH_URL',
  'MATERIAS_TUTORES_URL',
  'AGENDAMIENTO_SESIONES_URL',
  'REPORTES_MODERACION_URL',
] as const;

export function validarConfiguracion(entrada: Record<string, unknown>) {
  const puerto = Number(entrada.PORT ?? 8080);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }

  for (const nombre of DIRECCIONES_SERVICIOS) {
    const valor = entrada[nombre];
    if (valor === undefined || valor === '') continue;
    if (typeof valor !== 'string') {
      throw new Error(`${nombre} debe ser una dirección HTTP(S).`);
    }
    let direccion: URL;
    try {
      direccion = new URL(valor);
    } catch {
      throw new Error(`${nombre} debe ser una dirección HTTP(S) válida.`);
    }
    if (!['http:', 'https:'].includes(direccion.protocol)) {
      throw new Error(`${nombre} debe usar HTTP o HTTPS.`);
    }
  }

  return { ...entrada, PORT: puerto };
}
