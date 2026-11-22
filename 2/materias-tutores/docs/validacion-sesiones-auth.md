# Validación de sesiones con Auth

Materias/Tutores, Sesiones y Reportes validan primero el JWT y luego consultan
`GET /auth/sesion` con el mismo Bearer. Auth controla la revocación, el estado de
la cuenta y el límite de inactividad; una consulta válida también registra actividad.
Los roles y permisos de cada microservicio se siguen comprobando como antes.

- Sesión rechazada por Auth: HTTP 401.
- Auth inaccesible, respuesta incompatible o espera superior a 5 segundos: HTTP 503.
- Cada operación protegida consulta Auth, sin guardar resultados de autorización en caché.
- Las rutas internas conservan su secreto. Un Bearer inválido no se reemplaza por
  el secreto interno en la consulta de tutores.

Configurar `USUARIOS_AUTH_URL` en los tres microservicios con la base directa de
Auth, por ejemplo `http://127.0.0.1:3000`. Compartir el mismo `JWT_SECRET`.
Los archivos `.env` locales siguen fuera de Git.

## Prueba con Auth y PostgreSQL reales

Compilar Auth, Agendamiento/Sesiones y Reportes/Moderación con `npm.cmd run build`
en sus respectivas carpetas. Luego, desde `materias-tutores/materias-tutores`:

```powershell
npm.cmd run test:sesion-auth
```

La prueba usa los guards reales de los tres consumidores, HTTP real de Auth y
PostgreSQL local en un esquema temporal que elimina al terminar. Cubre actividad,
logout, suspensión, reactivación, inactividad, cuentas inactivas/no verificadas,
Auth detenido e integraciones internas. No prueba navegador ni operaciones de negocio completas.

Por defecto usa los proyectos hermanos de este workspace y la conexión del
`.env` de Auth. Se pueden indicar otras rutas con `AUTH_PROJECT_DIR`,
`SESIONES_PROJECT_DIR` y `REPORTES_PROJECT_DIR`, y otra base local con
`AUTH_TEST_DATABASE_URL`.

Las pruebas HTTP existentes de negocio sustituyen el cliente de sesión de Auth
de forma explícita. Sus JWT ficticios no representan sesiones reales.

En este Windows con Node 24, la suite completa de Sesiones cerró el proceso de
Jest; pudo ejecutarse desactivando la optimización de V8 solo para la prueba:

```powershell
node --no-opt --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand sessions.integration.e2e-spec.ts
```
