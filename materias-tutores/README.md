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

Antes de arrancar, copia `.env.example` a `.env` si aún no existe y completa `DATABASE_URL` con tu conexión PostgreSQL. Ejemplo de formato: `postgresql://USUARIO:CONTRASENA@localhost:5432/materias`. Codifica los caracteres especiales del usuario y contraseña como componentes de URL. Configura también `JWT_SECRET` con el mismo secreto HS256 de `usuarios-auth` para este ambiente (mínimo 32 bytes). No compartas credenciales ni subas `.env`.

La base de datos debe existir y PostgreSQL debe estar accesible. Hasta completar `DATABASE_URL` y `JWT_SECRET`, el servicio rechazará el arranque con un mensaje de configuración. NestJS carga `.env` automáticamente y valida esas variables y `PORT` (3000 por defecto). Aplica las migraciones con `npm run prisma:deploy` antes de iniciar una base nueva.

La aplicación expone `GET /materias`, que devuelve el catálogo ordenado por código. La ruta raíz `GET /` conserva `Hello World!` como comprobación inicial de funcionamiento.

## Catálogo de materias

El catálogo implementa RF05 del SRS. Cada materia tiene un identificador interno, un código académico único y un nombre. La API pública devuelve solamente `codigo` y `nombre`.

```sh
# Crear y aplicar una migración durante el desarrollo
npm run prisma:migrate -- --name nombre_del_cambio

# Cargar o actualizar las materias iniciales sin duplicarlas
npm run prisma:seed
```

La semilla usa el código de cada materia para actualizar registros existentes o crear los que falten. Después de cambiar `prisma/schema.prisma`, ejecuta `npm run prisma:generate`.

## Disponibilidad de tutores

Las rutas requieren `Authorization: Bearer <access_token>` con un JWT firmado por `usuarios-auth`. Se verifican firma HS256, vencimiento, emisor `stp-usuarios-auth`, audiencia `stp-clients`, el identificador numérico `sub` y el rol `TUTOR` (sin distinguir mayúsculas). `idTutor` siempre se obtiene de `sub`; no se recibe en el cuerpo ni en la URL.

| Método y ruta | Acción | Respuesta |
| --- | --- | --- |
| `POST /disponibilidad/bloques` | Crear bloque con `dia`, `horaInicio`, `horaFin` | `201`, bloque creado |
| `GET /disponibilidad/bloques` | Listar los bloques del tutor autenticado | `200`, arreglo de bloques |
| `PATCH /disponibilidad/bloques/:idBloque` | Cambiar uno o más de `dia`, `horaInicio`, `horaFin` | `200`, bloque actualizado |
| `DELETE /disponibilidad/bloques/:idBloque` | Cambiar el estado a `INACTIVO`; conserva la fila | `200`, bloque inactivo |

`dia` usa `YYYY-MM-DD` y las horas `HH:mm`, con inicio anterior al fin. Los identificadores se devuelven como texto para conservar la precisión de `BIGINT`. La creación inicia en `DISPONIBLE`; un bloque `RESERVADO` o `INACTIVO` no se puede editar ni desactivar. Entradas inválidas devuelven `400`, ausencia de token `401`, rol distinto de tutor `403`, bloque ajeno o inexistente `404` y conflicto de estado `409`.

La validación local del JWT no conoce revocaciones ni inactividad registradas por `usuarios-auth`; eso requiere una integración posterior con ese servicio. Agendamiento todavía debe conectar la reserva y liberación de bloques para completar la aplicación de BR12 y la visibilidad pública de BR13.

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
- `src/materias/`: módulo HTTP del catálogo de materias, con controlador, servicio y DTO de respuesta.
- `src/disponibilidad/`: gestión HTTP de bloques del tutor autenticado.
- `src/auth/`: verificación local del JWT y lectura segura del ID del tutor.
- `prisma/schema.prisma`: proveedor PostgreSQL y modelos `Materia` y `BloqueHorario`.
- `prisma/migrations/`: historial versionado de cambios de esquema.
- `prisma/seed.ts`: datos iniciales idempotentes del catálogo.
- `prisma.config.ts`: configuración de Prisma CLI y carga de `.env`.
- `test/`: pruebas de extremo a extremo.

El proyecto tiene sus propias dependencias y compilación. Según el SRS, se integrará mediante HTTP/REST con el API Gateway y gestionará su propio esquema o base de datos PostgreSQL, sin acceso directo a las bases de otros servicios.

La infraestructura de conexión usa Prisma y el adaptador PostgreSQL. Los módulos que necesiten consultar datos deben importar `DatabaseModule` e inyectar `PrismaService`. El catálogo de materias y la gestión propia de bloques están implementados; las postulaciones, la validación administrativa, la búsqueda de tutores y la integración con otros servicios quedan pendientes.

No se crean tablas al arrancar. Las migraciones crean y aplican los cambios de esquema en desarrollo. `npm run prisma:deploy` aplica migraciones existentes en el entorno de despliegue.

`npm ci` genera automáticamente el cliente Prisma; tras modificar el esquema, ejecuta `npm run prisma:generate`. Las pruebas unitarias y e2e usan sustitutos de la conexión y no requieren PostgreSQL; no demuestran que las credenciales locales sean válidas.

## Archivos locales

`.gitignore` excluye dependencias instaladas, compilaciones, cobertura, logs y archivos `.env` con sus variantes. Permite plantillas `.env.example` sin secretos. `package-lock.json` se conserva para reproducir la instalación con `npm ci`.

El cliente generado en `src/generated/prisma/` también está excluido. La configuración sigue la [documentación de Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction).

La auditoría de esta instalación reportó cuatro alertas altas en la cadena de dependencias de Prisma CLI (`prisma`, `@prisma/config`, `deepmerge-ts` y `mysql2`). La corrección automática propuesta cambia Prisma a otra versión mayor; no se aplicó `npm audit fix --force`. Revisar estas dependencias antes del despliegue.
