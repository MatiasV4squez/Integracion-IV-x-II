# Estrategia de CI

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (GitHub Actions).

## Cuándo se ejecuta
- **Push** a `main`, `App` y cualquier `feature/**`.
- **Pull request** cuyo destino sea `main` o `App`.

Así cada feature branch recibe feedback apenas se sube, y toda integración hacia `App`/`main` queda bloqueada en verde antes de mergear.

## Qué se ejecuta
En un solo job (`ubuntu-latest`), con `working-directory: proyect-app-studia`:

1. `actions/checkout`
2. `actions/setup-node` (Node 22, necesario para `--experimental-strip-types`) con `cache: npm` y `cache-dependency-path` apuntando al `package-lock.json` del proyecto, para no reinstalar node_modules en cada corrida.
3. `npm ci` — instala dependencias exactas del lockfile.
4. `npm run lint` — `expo lint`.
5. `npx tsc --noEmit` — type-check sin emitir archivos.
6. `npm test` — pruebas de reglas de negocio en `src/utils/*.test.mjs`.

Cualquier paso que falle corta el workflow (rojo en el PR).
