import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function fuentes(directorio: string): Promise<string[]> {
  const resultado: string[] = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...await fuentes(ruta));
    else if (entrada.name.endsWith('.ts') && !entrada.name.endsWith('.spec.ts')) resultado.push(ruta);
  }
  return resultado;
}

describe('Límites hexagonales de postulaciones e integraciones', () => {
  it.each(['postulaciones', 'integraciones'])('el núcleo de %s no depende del transporte ni de adaptadores concretos', async (modulo) => {
    const archivos = [...await fuentes(`src/${modulo}/dominio`), ...await fuentes(`src/${modulo}/aplicacion`)];
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const contenido = await readFile(archivo, 'utf8');
      const dependencias = [...contenido.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const dependencia of dependencias) {
        expect(dependencia, archivo).not.toMatch(/@nestjs|prisma|node:|infraestructura|generated|database|\.dto/);
      }
      expect(contenido, archivo).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
