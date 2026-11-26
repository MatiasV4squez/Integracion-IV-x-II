# CI/CD sin contenedores ni Kubero — Guía rápida

A diferencia de [`CI-CD.md`](CI-CD.md) (rama `main`, build de imágenes Docker + despliegue a Kubero), esta versión no construye imágenes ni despliega a ningún servidor: solo valida el código (lint, type-check, tests) en cada push o PR, usando directamente Node.js en el runner de GitHub Actions.

Ejemplo real ya funcionando: `.github/workflows/ci.yml` en la rama `App` (proyecto `proyect-app-studia`).

| Workflow | Se dispara con | Qué hace |
|---|---|---|
| `ci.yml` (rama `App`) | push a `main`, `App`, `feature/**`, o PR hacia `main`/`App` | `npm ci` (con caché), `npm run lint`, `npx tsc --noEmit`, `npm test` |

No hay paso de CD (despliegue): es solo CI. Si falla cualquier paso, el workflow queda en rojo y bloquea el merge, pero no se construye ni se sube nada a ningún lado.

## Pasos para activarlo en otra rama

Cada rama de este repo tiene una estructura de proyecto distinta (`proyect-app-studia/` en `App`, `client/`+`server/` en `main`, `fronted/` en `Web`), así que no es copiar y pegar el archivo tal cual: hay que apuntarlo a la carpeta correcta.

1. **Ubica el `package.json` del proyecto de tu rama** y revisa qué scripts tiene (`lint`, `test`, y si existe `build` o `tsc`). Por ejemplo, en `fronted/package.json`: `lint` es `oxlint`, `test` es `node --test`, y el type-check va incluido en `build` (`tsc -b && vite build`).
2. **Copia `.github/workflows/ci.yml`** (de la rama `App`) a tu rama y ajusta:
   - `working-directory` en `defaults.run`, apuntando a tu carpeta (ej. `fronted`).
   - `cache-dependency-path`, apuntando al `package-lock.json` de esa carpeta.
   - `node-version`, según el `engines.node` de tu `package.json` (si no especifica, usa la versión LTS actual).
   - El paso de type-check: solo agrégalo si tu proyecto usa TypeScript suelto; si el type-check ya ocurre dentro de `npm run build`, usa ese comando en vez de `npx tsc --noEmit`.
3. **Agrega tu rama en los triggers** del workflow:
   ```yaml
   on:
     push:
       branches: [main, App, mi-rama]
     pull_request:
       branches: [main, App, mi-rama]
   ```
4. **Haz commit y push del workflow a tu rama** (no basta con tenerlo en `App`; GitHub usa la versión del workflow que existe en la rama que dispara el evento):
   ```bash
   git checkout mi-rama
   git add .github/workflows/ci.yml
   git commit -m "CI: habilitar pipeline sin contenedores en mi-rama"
   git push
   ```
5. **Revisa en GitHub → pestaña Actions** que la corrida quede en verde.

No se necesitan secrets ni cuentas externas: todo corre con Node.js dentro del runner de GitHub Actions.

## Si además quieres un paso de CD (sin contenedores)

Esta guía documenta solo CI. Para agregar despliegue sin Docker ni Kubero, lo más simple sin credenciales nuevas es publicar el build como *artifact* descargable (`actions/upload-artifact`) al final del job. Para un despliegue real a algún hosting (GitHub Pages, Vercel, Netlify, EAS/Expo, etc.) se necesitaría definir el destino y configurar sus credenciales como secret del repositorio — dímelo si quieres que lo agregue.
