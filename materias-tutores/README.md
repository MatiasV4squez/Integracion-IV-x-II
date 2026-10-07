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

| Método y ruta                              | Acción                                              | Respuesta                 |
| ------------------------------------------ | --------------------------------------------------- | ------------------------- |
| `POST /disponibilidad/bloques`             | Crear bloque con `dia`, `horaInicio`, `horaFin`     | `201`, bloque creado      |
| `GET /disponibilidad/bloques`              | Listar los bloques del tutor autenticado            | `200`, arreglo de bloques |
| `PATCH /disponibilidad/bloques/:idBloque`  | Cambiar uno o más de `dia`, `horaInicio`, `horaFin` | `200`, bloque actualizado |
| `DELETE /disponibilidad/bloques/:idBloque` | Cambiar el estado a `INACTIVO`; conserva la fila    | `200`, bloque inactivo    |

`dia` usa `YYYY-MM-DD` y las horas `HH:mm`, con inicio anterior al fin. Los identificadores se devuelven como texto para conservar la precisión de `BIGINT`. La creación inicia en `DISPONIBLE`; un bloque `RESERVADO` o `INACTIVO` no se puede editar ni desactivar. Entradas inválidas devuelven `400`, ausencia de token `401`, rol distinto de tutor `403`, bloque ajeno o inexistente `404` y conflicto de estado `409`.

La validación local del JWT no conoce revocaciones ni inactividad registradas por `usuarios-auth`; eso requiere una integración posterior con ese servicio. Agendamiento todavía debe conectar la reserva y liberación de bloques para completar la aplicación de BR12 y la visibilidad pública de BR13.

### Consulta de disponibilidad para estudiantes

`GET /disponibilidad/tutores/:idTutor` devuelve los bloques de un tutor cuyo estado es `DISPONIBLE` y cuyo inicio todavía no ha llegado. Requiere un JWT válido de `usuarios-auth`; acepta usuarios autenticados con cualquier rol, incluidos los estudiantes. `idTutor` debe ser un entero positivo dentro del rango `BIGINT` de PostgreSQL. Un identificador inválido devuelve `400` y la ausencia o invalidez del token devuelve `401`. Si no hay bloques libres, devuelve `200` con `[]`.

La respuesta es un arreglo de objetos con `idBloque`, `dia`, `horaInicio`, `horaFin` y `estadoBloque`; `idBloque` se representa como texto. Se ordena por día y hora de inicio. Los horarios ya iniciados se excluyen usando la zona `America/Santiago`, incluidos sus cambios estacionales. Esta ruta no modifica bloques ni incluye datos de postulaciones, materias o reputación, que corresponden a otras tareas.

La consulta refleja los estados almacenados en `materias-tutores`. Para ocultar las solicitudes pendientes y sesiones confirmadas en la aplicación integrada, Agendamiento debe actualizar el estado de los bloques al reservarlos y liberarlos; esa integración sigue pendiente.

## Búsqueda de tutores por materia

`GET /tutores` devuelve los tutores con una habilitación vigente para la materia indicada, sus calificaciones y sus horarios disponibles. La consulta pagina los tutores antes de consultar sus perfiles y horarios, y utiliza un orden ascendente por identificador de habilitación.

| Parámetro   | Obligatorio | Valor predeterminado | Validación                                                                              |
| ----------- | ----------- | -------------------- | --------------------------------------------------------------------------------------- |
| `materiaId` | Sí          | —                    | Entero positivo dentro del rango `BIGINT` de PostgreSQL.                                |
| `page`      | No          | `1`                  | Entero positivo seguro; el desplazamiento `(page - 1) * limit` también debe ser seguro. |
| `limit`     | No          | `10`                 | Entero entre `1` y `100`.                                                               |

Los parámetros numéricos deben contener únicamente dígitos. Los valores vacíos, negativos, decimales, no numéricos o repetidos se rechazan con `400`. Los valores predeterminados se aplican únicamente cuando el parámetro no se envía.

Ejemplo de consulta:

```http
GET /tutores?materiaId=1&page=1&limit=2
```

Ejemplo ilustrativo de respuesta `200`:

```json
{
  "items": [
    {
      "idTutor": "10",
      "promedioCalificaciones": 4.5,
      "cantidadCalificaciones": 4,
      "horariosDisponibles": [
        {
          "idBloque": "5",
          "dia": "2026-10-08",
          "horaInicio": "09:00",
          "horaFin": "10:00"
        }
      ]
    },
    {
      "idTutor": "15",
      "promedioCalificaciones": null,
      "cantidadCalificaciones": 0,
      "horariosDisponibles": []
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 2,
  "totalPages": 2
}
```

`items` contiene únicamente los tutores de la página solicitada. `total` cuenta todas las habilitaciones vigentes de esa materia y `totalPages` es `Math.ceil(total / limit)`. Si no hay coincidencias, ambos totales son `0`. Si se pide una página posterior a la última, la respuesta sigue siendo `200`, con `items: []`, conservando el total de coincidencias y la página solicitada. El promedio es `null` cuando el tutor no tiene calificaciones. Los identificadores se devuelven como texto para conservar la precisión de `BIGINT`.

Los horarios incluyen únicamente bloques `DISPONIBLE` cuyo inicio no ha llegado, según la zona `America/Santiago`. Un tutor sin horarios disponibles permanece en los resultados con `horariosDisponibles: []`. La visibilidad refleja los estados de la base del microservicio; la reserva y liberación desde Agendamiento siguen pendientes de integración.

Esta ruta todavía no exige autenticación ni devuelve el nombre del tutor. Esas partes de RF09/CU07 quedan pendientes del contrato con `usuarios-auth`; esta implementación no completa por sí sola toda la búsqueda exigida por el SRS. La respuesta anterior era un arreglo; los consumidores deben utilizar ahora el objeto paginado y leer la lista desde `items`.

Las pruebas HTTP de esta ruta utilizan el controller, el caso de uso y los adaptadores, con Prisma simulado. También se comprobó manualmente con PostgreSQL local el reparto de tres tutores entre dos páginas y la exclusión de bloques reservados e inactivos; los datos temporales utilizados se eliminaron.

## Postulaciones y tutores habilitados

La migración `20261004120000_postulaciones_tutores` crea `postulacion_tutor`, `tutor_materia`, `perfil_tutor` y el registro idempotente de calificaciones. Ejecútala en la base del microservicio con `npm run prisma:deploy`. Los identificadores `BIGINT` se envían como texto en JSON. El JWT identifica al estudiante o al administrador; ninguna ruta acepta un ID de usuario en el cuerpo para postular.

| Método y ruta                                       | Acceso                | Uso                                                                                                                      |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `POST /postulaciones`                               | Usuario autenticado   | `multipart/form-data`: `idMateria` (texto) y `certificado` (PDF/PNG, hasta 5 MB). Responde `201` con estado `PENDIENTE`. |
| `GET /postulaciones/mias`                           | Usuario autenticado   | Historial propio.                                                                                                        |
| `GET /postulaciones/pendientes`                     | Administrador         | Cola en `PENDIENTE` y `PENDIENTE_ROL`.                                                                                   |
| `GET /postulaciones/:idPostulacion/certificado`     | Dueño o administrador | Descarga privada del archivo.                                                                                            |
| `PATCH /postulaciones/:idPostulacion/aprobar`       | Administrador         | JSON `{ "notaAcreditada": 5.0 }`, mínimo 5.0.                                                                            |
| `PATCH /postulaciones/:idPostulacion/rechazar`      | Administrador         | JSON `{ "motivoRechazo": "Certificado ilegible" }`.                                                                      |
| `POST /postulaciones/:idPostulacion/reintentar-rol` | Administrador         | Reintenta el rol tras un fallo del servicio de usuarios.                                                                 |

El backend verifica extensión, MIME, firma del archivo y tamaño; el administrador verifica manualmente el contenido y la nota. Los certificados se guardan con nombre derivado de SHA-256 en `CERTIFICADOS_DIR`, privado y persistente; respalda este directorio junto con la base. La ruta de certificados exige identidad y nunca expone la ruta local. Una única postulación activa por usuario y materia se protege con índice parcial en PostgreSQL. Una postulación rechazada puede enviarse de nuevo.

Al aprobar se registra `PENDIENTE_ROL` y la relación `tutor_materia` queda `vigente=false`. El servicio llama por HTTP al endpoint configurado en `USUARIOS_AUTH_ASIGNAR_TUTOR_URL` con `X-Integracion-Secret` y el JSON `{ "idUsuario": "10", "rol": "TUTOR" }`. Ese endpoint debe responder `2xx` y ser idempotente. Solo tras esa confirmación se marca `APROBADA` y `vigente=true`. Si falta la configuración o falla la llamada, la API devuelve `503`; el administrador puede reintentar sin volver a acreditar la nota. La URL concreta y el endpoint receptor se deben acordar con `usuarios-auth`; este repositorio no contiene ese microservicio y no se ha comprobado esa llamada contra él.

## Contratos con Agendamiento y reputación

Las rutas internas requieren `X-Integracion-Secret` de al menos 32 bytes. Configura el mismo secreto en el servicio emisor. No son rutas para clientes web o móviles.

| Método y ruta                                         | Cuerpo                                                                | Efecto                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PATCH /integraciones/bloques/:idBloque/estado`       | `{ "estado": "RESERVADO" }` o `{ "estado": "DISPONIBLE" }`            | Reserva al crear una solicitud; conserva la reserva en `PENDIENTE`, `CONFIRMADA` y `PENDIENTE_CIERRE`; libera al cancelar, rechazar o cerrar cuando ya no hay solicitudes activas. Es idempotente y solo permite `DISPONIBLE ↔ RESERVADO`. |
| `POST /integraciones/tutores/:idTutor/calificaciones` | `{ "idCalificacion": "42", "puntuacion": 5, "rolEvaluado": "TUTOR" }` | Registra una evaluación recibida como tutor. El identificador del evento evita duplicados.                                                                                                                                                 |
| `GET /tutores/:idTutor/reputacion`                    | JWT Bearer                                                            | Devuelve `cantidadCalificaciones`, `promedio` exacto y estado `ACTIVO` o `EN_REVISION`.                                                                                                                                                    |

La búsqueda pública existente solo devuelve bloques `DISPONIBLE`, y la edición o desactivación de un bloque exige ese mismo estado mediante una escritura condicional. El evento de calificación actualiza suma y cantidad en una transacción serializable; desde tres calificaciones, un promedio inferior a 2.5 marca `EN_REVISION`. El servicio emisor debe enviar únicamente notas que el usuario recibió actuando como tutor. La fuente de verdad de sesiones y calificaciones está en otros microservicios, por lo que el despliegue integrado requiere que estos llamen a las rutas anteriores; no se han probado llamadas reales entre micros.

La documentación OpenAPI está disponible en `GET /api` al iniciar la aplicación.

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
- `src/disponibilidad/`: gestión HTTP de bloques propios y consulta de horarios disponibles de un tutor.
- `src/auth/`: verificación local del JWT y lectura segura del ID del tutor.
- `src/tutores/application/`: caso de uso, modelos y ports de búsqueda sin dependencias de HTTP ni Prisma.
- `src/tutores/infrastructure/`: adaptadores de Prisma y disponibilidad; `http/` contiene el controller y los DTO y validadores de consulta.
- `prisma/schema.prisma`: modelos de materia, bloque, postulación, habilitación y reputación.
- `prisma/migrations/`: historial versionado de cambios de esquema.
- `prisma/seed.ts`: datos iniciales idempotentes del catálogo.
- `prisma.config.ts`: configuración de Prisma CLI y carga de `.env`.
- `test/`: pruebas de extremo a extremo.

El proyecto tiene sus propias dependencias y compilación. Según el SRS, se integra mediante HTTP/REST con otros servicios y gestiona su propio esquema o base de datos PostgreSQL, sin acceso directo a las bases ajenas.

La infraestructura de conexión usa Prisma y el adaptador PostgreSQL. Los módulos que necesiten consultar datos importan `DatabaseModule` e inyectan `PrismaService`. Están implementados el catálogo, la gestión de bloques, las postulaciones, la revisión y los contratos internos; falta conectarlos y probarlos contra los otros microservicios reales.

No se crean tablas al arrancar. Las migraciones crean y aplican los cambios de esquema en desarrollo. `npm run prisma:deploy` aplica migraciones existentes en el entorno de despliegue.

`npm ci` genera automáticamente el cliente Prisma; tras modificar el esquema, ejecuta `npm run prisma:generate`. Las pruebas unitarias y e2e usan sustitutos de la conexión y no requieren PostgreSQL; no demuestran que las credenciales locales sean válidas.

## Archivos locales

`.gitignore` excluye dependencias instaladas, compilaciones, cobertura, logs y archivos `.env` con sus variantes. Permite plantillas `.env.example` sin secretos. `package-lock.json` se conserva para reproducir la instalación con `npm ci`.

El cliente generado en `src/generated/prisma/` también está excluido. La configuración sigue la [documentación de Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction).

La auditoría de esta instalación reportó cuatro alertas altas en la cadena de dependencias de Prisma CLI (`prisma`, `@prisma/config`, `deepmerge-ts` y `mysql2`). La corrección automática propuesta cambia Prisma a otra versión mayor; no se aplicó `npm audit fix --force`. Revisar estas dependencias antes del despliegue.
