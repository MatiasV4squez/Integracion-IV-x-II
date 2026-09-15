# materias-tutores

Base del microservicio de Materias y Tutores del Sistema de Tutorías entre Pares (STP), creada con NestJS y TypeScript estricto.

## Requisitos

- Node.js 24 LTS y npm.

## Instalación y ejecución

Desde esta carpeta:

```sh
npm ci
npm run prisma:generate
npm run start:dev
```

En PowerShell, si la política de ejecución bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.

Antes de arrancar, copia `.env.example` a `.env` si aún no existe y completa `DATABASE_URL` con tu conexión PostgreSQL. Ejemplo de formato: `postgresql://USUARIO:CONTRASENA@localhost:5432/materias`. Codifica los caracteres especiales del usuario y contraseña como componentes de URL. No compartas credenciales ni subas `.env`.

La base de datos debe existir y PostgreSQL debe estar accesible. El `.env` local se entrega sin credenciales: hasta completar `DATABASE_URL`, el servicio rechazará el arranque con un mensaje de configuración. NestJS carga `.env` automáticamente y valida `DATABASE_URL` y `PORT` (3000 por defecto).

`GET /` devuelve `Hello World!` como comprobación inicial de funcionamiento.

## Verificación

```sh
npm run build
npm run prisma:validate
npm run lint
npm test
npm run test:e2e
```

## Estructura y alcance

- `src/main.ts`: arranque del servicio HTTP.
- `src/app.module.ts`: módulo raíz y composición de dependencias.
- `src/app.controller.ts`: controlador inicial.
- `src/app.service.ts`: servicio inicial, separado del controlador.
- `src/config/environment.ts`: validación de configuración al arrancar.
- `src/database/`: módulo que exporta una instancia de `PrismaService`, con conexión al iniciar y desconexión al cerrar.
- `prisma/schema.prisma`: proveedor PostgreSQL y futuros modelos del dominio.
- `prisma.config.ts`: configuración de Prisma CLI y carga de `.env`.
- `test/`: pruebas de extremo a extremo.

El proyecto tiene sus propias dependencias y compilación. Según el SRS, se integrará mediante HTTP/REST con el API Gateway y gestionará su propio esquema o base de datos PostgreSQL, sin acceso directo a las bases de otros servicios.

La infraestructura de conexión usa Prisma y el adaptador PostgreSQL. Los módulos que necesiten consultar datos deben importar `DatabaseModule` e inyectar `PrismaService`. El catálogo, las postulaciones, la validación administrativa, la búsqueda de tutores, los modelos y la integración con otros servicios quedan pendientes.

No se crean tablas al arrancar. Cuando se incorporen modelos, `npm run prisma:migrate -- --name nombre_del_cambio` permitirá crear y aplicar una migración en desarrollo. `npm run prisma:deploy` aplicará migraciones existentes en el entorno de despliegue. No se han ejecutado migraciones en esta entrega.

`npm ci` genera automáticamente el cliente Prisma; tras modificar el esquema, ejecuta `npm run prisma:generate`. Las pruebas unitarias y e2e usan sustitutos de la conexión y no requieren PostgreSQL; no demuestran que las credenciales locales sean válidas.

## Archivos locales

`.gitignore` excluye dependencias instaladas, compilaciones, cobertura, logs y archivos `.env` con sus variantes. Permite plantillas `.env.example` sin secretos. `package-lock.json` se conserva para reproducir la instalación con `npm ci`.

El cliente generado en `src/generated/prisma/` también está excluido. La configuración sigue la [documentación de Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction).

La auditoría de esta instalación reportó cuatro alertas altas en la cadena de dependencias de Prisma CLI (`prisma`, `@prisma/config`, `deepmerge-ts` y `mysql2`). La corrección automática propuesta cambia Prisma a otra versión mayor; no se aplicó `npm audit fix --force`. Revisar estas dependencias antes del despliegue.
