import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { apiUrl, getAuthToken } from '@/infrastructure/http/http-client';

/**
 * Descarga un archivo protegido del Gateway (con el JWT) y abre el menú del sistema para verlo o
 * guardarlo. Versión nativa; la web está en `descargar-archivo.web.ts`.
 */
export async function descargarArchivo(path: string, nombre: string, mimeType: string): Promise<void> {
  const token = getAuthToken();
  const destino = new File(Paths.cache, `${Date.now()}-${nombre.replace(/[^\w.-]/g, '_')}`);
  const archivo = await File.createDownloadTask(apiUrl(path), destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).downloadAsync();
  if (!archivo) throw new Error('La descarga se interrumpió.');
  if (!(await Sharing.isAvailableAsync())) throw new Error(`Archivo guardado en ${archivo.uri}.`);
  await Sharing.shareAsync(archivo.uri, { mimeType, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.png', dialogTitle: nombre });
}
