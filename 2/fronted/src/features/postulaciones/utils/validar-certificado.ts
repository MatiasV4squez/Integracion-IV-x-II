export const TAMANO_MAXIMO_CERTIFICADO = 5_000_000
export const LONGITUD_MAXIMA_NOMBRE_CERTIFICADO = 255
export type TipoCertificado = 'application/pdf' | 'image/png'

const FIRMAS: Record<TipoCertificado, { extension: string; bytes: number[] }> = {
  'application/pdf': { extension: '.pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  'image/png': { extension: '.png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
}

// Replica las reglas de materias-tutores para avisar antes de subir el archivo; el servicio vuelve a validarlo.
export async function validarCertificado(
  archivo: Blob & { name: string } | null | undefined,
): Promise<{ tipo: TipoCertificado } | { error: string }> {
  if (!archivo) return { error: 'Adjunta tu certificado en PDF o PNG.' }
  if (archivo.size < 1) return { error: 'El certificado está vacío.' }
  if (archivo.size > TAMANO_MAXIMO_CERTIFICADO) return { error: 'El certificado debe pesar como máximo 5 MB.' }
  if (archivo.name.length > LONGITUD_MAXIMA_NOMBRE_CERTIFICADO) {
    return { error: `El nombre del archivo debe tener como máximo ${LONGITUD_MAXIMA_NOMBRE_CERTIFICADO} caracteres.` }
  }
  const nombre = archivo.name.toLowerCase()
  const tipo = (Object.keys(FIRMAS) as TipoCertificado[]).find((candidato) => nombre.endsWith(FIRMAS[candidato].extension))
  if (!tipo || (archivo.type && archivo.type !== tipo)) return { error: 'El certificado debe ser un archivo PDF o PNG.' }
  const { bytes } = FIRMAS[tipo]
  const cabecera = new Uint8Array(await archivo.slice(0, bytes.length).arrayBuffer())
  if (cabecera.length !== bytes.length || bytes.some((byte, indice) => cabecera[indice] !== byte)) {
    return { error: 'El archivo está dañado o no es un PDF o PNG válido.' }
  }
  return { tipo }
}
