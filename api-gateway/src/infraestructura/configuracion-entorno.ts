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

  const espera = Number(entrada.HTTP_TIMEOUT_MS ?? 10000);
  if (!Number.isInteger(espera) || espera < 1 || espera > 2147483647) {
    throw new Error('HTTP_TIMEOUT_MS debe ser un entero entre 1 y 2147483647.');
  }

  const origen = entrada.CORS_ORIGIN ?? 'http://localhost:5173';
  if (typeof origen !== 'string') {
    throw new Error('CORS_ORIGIN debe ser un origen HTTP(S) o *.');
  }
  if (origen !== '*') {
    let url: URL;
    try {
      url = new URL(origen);
    } catch {
      throw new Error('CORS_ORIGIN debe ser un origen HTTP(S) válido o *.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origen) {
      throw new Error('CORS_ORIGIN debe contener solo el origen, sin ruta ni barra final.');
    }
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
    if (direccion.search || direccion.hash) {
      throw new Error(`${nombre} debe ser una URL base sin consulta ni fragmento.`);
    }
  }

  return { ...entrada, PORT: puerto, HTTP_TIMEOUT_MS: espera, CORS_ORIGIN: origen };
}
