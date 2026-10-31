// Entrega un Blob al navegador como descarga y libera la URL temporal.
export function descargarArchivo(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  try { enlace.click() }
  finally {
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
