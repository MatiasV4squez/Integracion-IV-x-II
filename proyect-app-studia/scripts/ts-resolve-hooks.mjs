// Permite que las pruebas de Node importen módulos .ts con el alias "@/" y sin extensión,
// igual que lo hace la app (TypeScript + Metro). Solo se usa en `npm test`.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const CANDIDATES = ['.ts', '/index.ts'];

function findFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const suffix of CANDIDATES) {
    if (existsSync(base + suffix) && statSync(base + suffix).isFile()) return base + suffix;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let target = null;
  if (specifier.startsWith('@/')) {
    target = path.join(SRC, specifier.slice(2));
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target) {
    const file = findFile(target);
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
