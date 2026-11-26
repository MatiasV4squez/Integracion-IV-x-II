# CI/CD — Guía rápida

Este repo tiene 3 workflows de GitHub Actions (`.github/workflows/`):

| Workflow | Se dispara con | Qué hace |
|---|---|---|
| `client-build.yml` | push a `main` que toque `client/**` | construye la imagen Docker del cliente y la sube a GHCR como `:latest` |
| `server-build.yml` | push a `main` que toque `server/**` | construye la imagen Docker del servidor y la sube a GHCR como `:latest` |
| `deploy.yml` | que termine con éxito uno de los dos builds anteriores, en `main` | llama a la API de Kubero y reinicia `client2`/`server2` en producción |

Los tres solo están configurados para la rama `main`. Para que el mismo pipeline corra en otra rama hay que agregarla explícitamente en cada workflow.

## Pasos para activarlo en otra rama

Supongamos que la rama se llama `mi-rama`.

1. **Edita `client-build.yml`** y agrega la rama en `on.push.branches`:
   ```yaml
   on:
     push:
       branches: [main, mi-rama]
   ```
2. **Edita `server-build.yml`** igual:
   ```yaml
   on:
     push:
       branches: [main, mi-rama]
   ```
3. **Edita `deploy.yml`** y agrega la rama en `on.workflow_run.branches` (si no la agregas aquí, las imágenes se van a construir pero Kubero nunca se va a reiniciar):
   ```yaml
   on:
     workflow_run:
       workflows: ["Build client image", "Build server image"]
       types: [completed]
       branches: [main, mi-rama]
   ```
4. **Haz commit y push de esos 3 archivos a `mi-rama`** (no basta con cambiarlos en `main`; GitHub usa la versión del workflow que existe en la rama que dispara el evento):
   ```bash
   git checkout mi-rama
   git add .github/workflows/client-build.yml .github/workflows/server-build.yml .github/workflows/deploy.yml
   git commit -m "CI/CD: habilitar pipeline en mi-rama"
   git push
   ```
5. **Dispara el build**: haz un push a `mi-rama` que modifique algo dentro de `client/` o `server/`. Eso basta para que arranque `client-build.yml` / `server-build.yml`, y al terminar bien, `deploy.yml`.
6. **Revisa en GitHub → pestaña Actions** que las 3 corridas (`Build client image`, `Build server image`, `Deploy to Kubero`) queden en verde.

No necesitas crear secrets nuevos: `GITHUB_TOKEN` lo provee GitHub automáticamente, y `KUBERO_TOKEN` ya está configurado a nivel de repositorio, así que está disponible para cualquier rama.

## ⚠️ Importante: el tag `:latest`

Las imágenes siempre se suben con el tag fijo `:latest` (`ghcr.io/.../integracion-iv-x-ii-client:latest`), y `deploy.yml` reinicia la app de **producción** en Kubero. Si activas esto en una rama de prueba, cada push a esa rama **sobrescribe la imagen que usa producción** y dispara un reinicio en producción.

Si solo quieres probar el pipeline sin afectar producción:
- Usa un tag distinto por rama, por ejemplo `${{ github.ref_name }}` en vez de `latest` en el `tags:` de `client-build.yml`/`server-build.yml`, y
- No agregues esa rama en `deploy.yml` (así se construye la imagen pero no se reinicia nada en producción).

Si en cambio el objetivo es que esa rama despliegue igual que `main`, deja los pasos 1-6 tal cual, pero ten claro que vas a estar pisando el despliegue productivo.
