import { api } from '@/infrastructure/http/http-client';

/** Web: pide el archivo con el JWT y lo entrega al navegador como descarga. */
export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  const blob = await api.getBlob(path);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
