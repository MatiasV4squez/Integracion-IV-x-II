# materias-tutores

Microservicio de Materias y Tutores del Sistema de Tutorías entre Pares (STP), creado con NestJS, TypeScript estricto, Prisma y PostgreSQL.

Documentación complementaria:

- [Ejemplos de API y demostración local](docs/api-y-demostracion.md).
- [Pruebas existentes, ejecución y límites de verificación](docs/pruebas.md).

## Requisitos

- Node.js 24 LTS y npm.
- PostgreSQL accesible y una base de datos creada para este microservicio.

## Instalación y ejecución

Ejecuta los comandos desde `materias-tutores`, donde está su `package.json`. Primero crea `.env` a partir de `.env.example`, solo si todavía no existe, y completa la configuración indicada abajo. En PowerShell:

```powershell
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
```

Con PostgreSQL iniciado y la base creada:

```sh
npm ci
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

En PowerShell, si la política de ejecución bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.

`npm ci` instala las versiones de `package-lock.json` y su script `postinstall` genera el cliente Prisma. `prisma:deploy` aplica las migraciones existentes; `prisma:seed` carga el catálogo. La semilla no crea tutores, postulaciones ni horarios de demostración.

Completa `DATABASE_URL` con tu conexión PostgreSQL. Ejemplo de formato: `postgresql://USUARIO:CONTRASENA@localhost:5432/materias`. Codifica los caracteres especiales del usuario y contraseña como componentes de URL. Configura también `JWT_SECRET` con el mismo secreto HS256 de `usuarios-auth` para este ambiente (mínimo 32 bytes). No compartas credenciales ni subas `.env`.

- **`DATABASE_URL`:** Obligatoria: conexión a la base PostgreSQL del microservicio.
- **`JWT_SECRET`:** Obligatoria: al menos 32 bytes; debe coincidir con Auth para aceptar sus tokens.
- **`PORT`:** Opcional: `3000` por defecto; entero entre `1` y `65535`.
- **`INTEGRACION_SECRET`:** Necesaria para las rutas internas y la asignación remota de rol. Si se define, debe tener al menos 32 bytes. Sin ella, las rutas internas responden `401`.
- **`USUARIOS_AUTH_ASIGNAR_TUTOR_URL`:** Endpoint HTTP/HTTPS acordado con Auth. Necesario para completar una aprobación; sin configuración, se conserva `PENDIENTE_ROL` y se responde `503`.
- **`CERTIFICADOS_DIR`:** Directorio privado y escribible para PDF/PNG; por defecto `./certificados`, relativo a esta carpeta.
- **`TEST_DATABASE_URL`:** Solo para pruebas reales de reputación; si no se define, se utiliza `DATABASE_URL`.

Las variables opcionales no configuradas deben omitirse, no dejarse con un valor vacío. Los secretos JWT e interno tienen funciones distintas; los marcadores de esta documentación no sirven como credenciales.

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

El catálogo inicial contiene `MAT1188` (CÁLCULO INTERMEDIO), `INFO1157` (SISTEMAS INTELIGENTES) e `INFO1126` (PROGRAMACIÓN III). Sus identificadores se generan en cada base; no se debe asumir que una materia siempre tiene el ID `1`.

## Disponibilidad de tutores

Las rutas requieren `Authorization: Bearer <access_token>` con un JWT firmado por `usuarios-auth`. Se verifican firma HS256, vencimiento, emisor `stp-usuarios-auth`, audiencia `stp-clients`, el identificador numérico `sub` y el rol `TUTOR` (sin distinguir mayúsculas). `idTutor` siempre se obtiene de `sub`; no se recibe en el cuerpo ni en la URL.

**`POST /disponibilidad/bloques`**

- Acción: Crear bloque con `dia`, `horaInicio`, `horaFin`
- Respuesta: `201`, bloque creado

**`GET /disponibilidad/bloques`**

- Acción: Listar los bloques del tutor autenticado
- Respuesta: `200`, arreglo de bloques

**`PATCH /disponibilidad/bloques/:idBloque`**

- Acción: Cambiar uno o más de `dia`, `horaInicio`, `horaFin`
- Respuesta: `200`, bloque actualizado

**`DELETE /disponibilidad/bloques/:idBloque`**

- Acción: Cambiar el estado a `INACTIVO`; conserva la fila
- Respuesta: `200`, bloque inactivo

`dia` usa `YYYY-MM-DD` y las horas `HH:mm`, con inicio anterior al fin. Los identificadores se devuelven como texto para conservar la precisión de `BIGINT`. La creación inicia en `DISPONIBLE`; un bloque `RESERVADO` o `INACTIVO` no se puede editar ni desactivar. Entradas inválidas devuelven `400`, ausencia de token `401`, rol distinto de tutor `403`, bloque ajeno o inexistente `404` y conflicto de estado `409`.

La validación local del JWT no conoce revocaciones ni inactividad registradas por `usuarios-auth`; eso requiere una integración posterior con ese servicio. Agendamiento todavía debe conectar la reserva y liberación de bloques para completar la aplicación de BR12 y la visibilidad pública de BR13.

### Consulta de disponibilidad para estudiantes

`GET /disponibilidad/tutores/:idTutor` devuelve los bloques de un tutor cuyo estado es `DISPONIBLE` y cuyo inicio todavía no ha llegado. Requiere un JWT válido de `usuarios-auth`; acepta usuarios autenticados con cualquier rol, incluidos los estudiantes. `idTutor` debe ser un entero positivo dentro del rango `BIGINT` de PostgreSQL. Un identificador inválido devuelve `400` y la ausencia o invalidez del token devuelve `401`. Si no hay bloques libres, devuelve `200` con `[]`.

La respuesta es un arreglo de objetos con `idBloque`, `dia`, `horaInicio`, `horaFin` y `estadoBloque`; `idBloque` se representa como texto. Se ordena por día y hora de inicio. Los horarios ya iniciados se excluyen usando la zona `America/Santiago`, incluidos sus cambios estacionales. Esta ruta no modifica bloques ni incluye datos de postulaciones, materias o reputación, que corresponden a otras tareas.

La consulta refleja los estados almacenados en `materias-tutores`. Para ocultar las solicitudes pendientes y sesiones confirmadas en la aplicación integrada, Agendamiento debe actualizar el estado de los bloques al reservarlos y liberarlos; esa integración sigue pendiente.

## Búsqueda de tutores por materia

`GET /tutores` devuelve los tutores con una habilitación vigente para la materia indicada, sus calificaciones y sus horarios disponibles. La consulta pagina los tutores antes de consultar sus perfiles y horarios, y utiliza un orden ascendente por identificador de habilitación.

**`materiaId`**

- Obligatorio: Sí
- Valor predeterminado: —
- Validación: Entero positivo dentro del rango `BIGINT` de PostgreSQL.

**`page`**

- Obligatorio: No
- Valor predeterminado: `1`
- Validación: Entero positivo seguro; el desplazamiento `(page - 1) * limit` también debe ser seguro.

**`limit`**

- Obligatorio: No
- Valor predeterminado: `10`
- Validación: Entero entre `1` y `100`.

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

**`POST /postulaciones`**

- Acceso: Usuario autenticado
- Uso: `multipart/form-data`: `idMateria` (texto) y `certificado` (PDF/PNG, hasta 5 MB). Responde `201` con estado `PENDIENTE`.

**`GET /postulaciones/mias`**

- Acceso: Usuario autenticado
- Uso: Historial propio.

**`GET /postulaciones/pendientes`**

- Acceso: Administrador
- Uso: Cola en `PENDIENTE` y `PENDIENTE_ROL`.

**`GET /postulaciones/:idPostulacion/certificado`**

- Acceso: Dueño o administrador
- Uso: Descarga privada del archivo.

**`PATCH /postulaciones/:idPostulacion/aprobar`**

- Acceso: Administrador
- Uso: JSON `{ "notaAcreditada": 5.0 }`, mínimo 5.0.

**`PATCH /postulaciones/:idPostulacion/rechazar`**

- Acceso: Administrador
- Uso: JSON `{ "motivoRechazo": "Certificado ilegible" }`.

**`POST /postulaciones/:idPostulacion/reintentar-rol`**

- Acceso: Administrador
- Uso: Reintenta el rol tras un fallo del servicio de usuarios.

El backend verifica extensión, MIME, firma del archivo y tamaño; el administrador verifica manualmente el contenido y la nota. Los certificados se guardan con nombre derivado de SHA-256 en `CERTIFICADOS_DIR`, privado y persistente; respalda este directorio junto con la base. La ruta de certificados exige identidad y nunca expone la ruta local. Una única postulación activa por usuario y materia se protege con índice parcial en PostgreSQL. Una postulación rechazada puede enviarse de nuevo.

Al aprobar se registra `PENDIENTE_ROL` y la relación `tutor_materia` queda `vigente=false`. El servicio llama por HTTP al endpoint configurado en `USUARIOS_AUTH_ASIGNAR_TUTOR_URL` con `X-Integracion-Secret` y el JSON `{ "idUsuario": "10", "rol": "TUTOR" }`. Ese endpoint debe responder `2xx` y ser idempotente. Solo tras esa confirmación se marca `APROBADA` y `vigente=true`. Si falta la configuración o falla la llamada, la API devuelve `503`; el administrador puede reintentar sin volver a acreditar la nota. La URL concreta y el endpoint receptor se deben acordar con `usuarios-auth`; este repositorio no contiene ese microservicio y no se ha comprobado esa llamada contra él.

## Contratos con Agendamiento y reputación

Las rutas internas requieren `X-Integracion-Secret` de al menos 32 bytes. Configura el mismo secreto en el servicio emisor. No son rutas para clientes web o móviles.

**`PATCH /integraciones/bloques/:idBloque/estado`**

- Cuerpo: `{ "estado": "RESERVADO" }` o `{ "estado": "DISPONIBLE" }`
- Efecto: Reserva al crear una solicitud; conserva la reserva en `PENDIENTE`, `CONFIRMADA` y `PENDIENTE_CIERRE`; libera al cancelar, rechazar o cerrar cuando ya no hay solicitudes activas. Es idempotente y solo permite `DISPONIBLE ↔ RESERVADO`.

**`POST /integraciones/tutores/:idTutor/calificaciones`**

- Cuerpo: `{ "idCalificacion": "42", "puntuacion": 5, "rolEvaluado": "TUTOR" }`
- Efecto: Registra una evaluación recibida como tutor. El identificador del evento evita duplicados.

**`GET /tutores/:idTutor/reputacion`**

- Cuerpo: JWT Bearer
- Efecto: Devuelve `cantidadCalificaciones`, `promedio` exacto y estado `ACTIVO` o `EN_REVISION`.

La búsqueda pública existente solo devuelve bloques `DISPONIBLE`, y la edición o desactivación de un bloque exige ese mismo estado mediante una escritura condicional. El evento de calificación actualiza suma y cantidad en una transacción serializable; desde tres calificaciones, un promedio inferior a 2.5 marca `EN_REVISION`. El servicio emisor debe enviar únicamente notas que el usuario recibió actuando como tutor. La fuente de verdad de sesiones y calificaciones está en otros microservicios; quedan por verificar sus llamadas reales a los contratos internos.

### Cálculo de reputación y estado En revisión

El módulo `src/reputacion/` implementa la parte de RF25 correspondiente a BR07, BR08 y CA09. Recibe eventos de calificación mediante la ruta interna existente; no crea sesiones ni calificaciones en el servicio de Agendamiento.

- Cada evento debe contener un identificador de calificación positivo en texto, un puntaje entero de `1` a `5` y `rolEvaluado: "TUTOR"`. Las notas recibidas como Tutee se rechazan y no modifican la reputación.
- El promedio es la suma de notas dividida por su cantidad, sin redondearlo para evaluar el umbral. Con cero notas, el promedio es `null`.
- Desde tres calificaciones, un promedio estrictamente menor a `2.5` marca `EN_REVISION`. Un promedio igual a `2.5` no activa la revisión.
- Se conserva `EN_REVISION` aunque el promedio suba después. El SRS deja el perfil sujeto a evaluación administrativa y no define una salida automática; no se implementa aquí una resolución administrativa ni una suspensión de cuenta.
- El registro del evento, los acumuladores y el estado se escriben en una transacción Serializable. Un fallo revierte todos sus cambios.
- Reenviar un evento con el mismo identificador, tutor y puntaje devuelve la reputación actual sin acumularlo otra vez, incluso si después se deshabilitó al tutor. Reutilizar el identificador con otro tutor o puntaje devuelve `409`.
- Una calificación nueva requiere una habilitación vigente del tutor. Los conflictos de concurrencia se reintentan hasta tres veces; si persisten, se devuelve `409` y el emisor puede reenviar el mismo evento.

Ejemplo del cuerpo de `POST /integraciones/tutores/10/calificaciones`, con `X-Integracion-Secret`:

```json
{
  "idCalificacion": "42",
  "puntuacion": 2,
  "rolEvaluado": "TUTOR"
}
```

La respuesta `201` y la consulta `GET /tutores/10/reputacion` utilizan la misma estructura:

```json
{
  "idTutor": "10",
  "cantidadCalificaciones": 3,
  "promedio": 2.3333333333333335,
  "estado": "EN_REVISION"
}
```

La consulta requiere un JWT válido. Un tutor habilitado sin perfil de calificaciones devuelve `200` con cantidad `0`, promedio `null` y estado `ACTIVO`; un tutor desconocido devuelve `404`. Entradas inválidas devuelven `400`, una clave interna o JWT inválido `401`, y una nota bajo otro rol, un tutor no habilitado o un evento contradictorio `409`.

El dominio contiene el cálculo y las reglas sin importar Nest ni Prisma. Los casos de uso coordinan el registro y la consulta mediante el port `ReputacionRepository`, que expone una transacción con operaciones del negocio. El adaptador Prisma implementa ese contrato y los reintentos. Los controllers validan HTTP, aplican los guards y traducen los errores del dominio a respuestas HTTP. `IntegracionesService` conserva el contrato existente de reserva y liberación de bloques; el cálculo de reputación se gestiona en `src/reputacion/`.

Agendamiento conserva la responsabilidad de comprobar que la sesión esté Completada, que el evaluador sea un participante y que exista una sola calificación por participante. Debe enviar únicamente calificaciones recibidas por el tutor y reutilizar el mismo identificador al reintentar una entrega. No se accede a su base de datos ni se modifica su código. El receptor se probó con eventos de prueba; queda verificar el envío desde el microservicio real. Auth y Moderación no son dependencias del cálculo; la consulta mantiene la comprobación local de JWT existente, con las limitaciones de revocación ya documentadas.

La interfaz Swagger está disponible en `GET /api` y el documento OpenAPI en `GET /api-json` al iniciar la aplicación. Las anotaciones actuales no describen con el mismo detalle todas las respuestas del catálogo, disponibilidad y búsqueda; consulta también los [ejemplos de API](docs/api-y-demostracion.md).

## Verificación

```sh
npm run build
npm run prisma:validate
npm run lint
npm test
npm run test:e2e
```

Para las pruebas de reputación con PostgreSQL real:

```sh
npm run test:reputacion:postgres
```

Este comando carga `TEST_DATABASE_URL` si está definida; de lo contrario, utiliza `DATABASE_URL` del entorno o de `.env`. Solo permite servidores locales. Necesita permisos para crear y eliminar un esquema: crea `test_reputacion_<uuid>`, aplica allí el SQL de las migraciones existentes y lo elimina al finalizar. No requiere migraciones nuevas ni instala dependencias. Los registros de prueba no se insertan en `public` y se comprueba que sus tablas no hayan cambiado.

Las pruebas reales recorren HTTP, guards, casos de uso y Prisma con claves y tokens exclusivos de pruebas. Verifican el umbral, su igualdad exacta, duplicados, eventos contradictorios, rollback, entregas simultáneas, conservación de BIGINT y consultas sin notas. No necesitan iniciar Auth ni Agendamiento.

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
- `src/reputacion/`: dominio, casos de uso, port de repositorio y adaptadores HTTP/Prisma para el cálculo de reputación.
- `prisma/schema.prisma`: modelos de materia, bloque, postulación, habilitación y reputación.
- `prisma/migrations/`: historial versionado de cambios de esquema.
- `prisma/seed.ts`: datos iniciales idempotentes del catálogo.
- `prisma.config.ts`: configuración de Prisma CLI y carga de `.env`.
- `test/`: pruebas de extremo a extremo.

El proyecto tiene sus propias dependencias y compilación. Según el SRS, se integra mediante HTTP/REST con otros servicios y gestiona su propio esquema o base de datos PostgreSQL, sin acceso directo a las bases ajenas.

Tutores y Reputación separan casos de uso, ports y adaptadores. Materias, Disponibilidad y Postulaciones conservan la estructura de módulos, controllers y services de NestJS, con acceso directo a Prisma desde los services; su adaptación a arquitectura hexagonal sigue pendiente. La organización del proyecto completo todavía no es hexagonal.

La infraestructura de conexión usa Prisma y el adaptador PostgreSQL. Los módulos que necesiten consultar datos importan `DatabaseModule` e inyectan `PrismaService`. Están implementados el catálogo, la gestión de bloques, las postulaciones, la revisión y los contratos internos; falta conectarlos y probarlos contra los otros microservicios reales.

No se crean tablas al arrancar. Las migraciones crean y aplican los cambios de esquema en desarrollo. `npm run prisma:deploy` aplica migraciones existentes en el entorno de despliegue.

`npm ci` genera automáticamente el cliente Prisma; tras modificar el esquema, ejecuta `npm run prisma:generate`. Las pruebas unitarias y `test:e2e` usan sustitutos de la conexión y no requieren PostgreSQL; no demuestran que las credenciales locales sean válidas. `test:reputacion:postgres` es la verificación separada con la base real.

## Archivos locales

`.gitignore` excluye dependencias instaladas, compilaciones, cobertura, logs y archivos `.env` con sus variantes. Permite plantillas `.env.example` sin secretos. `package-lock.json` se conserva para reproducir la instalación con `npm ci`.

El cliente generado en `src/generated/prisma/` también está excluido. La configuración sigue la [documentación de Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction).

La revisión y corrección de las vulnerabilidades notificadas por `npm audit` quedó pendiente por decisión del equipo. La cantidad depende de las versiones instaladas y de los avisos publicados; no se aplicó `npm audit fix --force`, que proponía cambiar la versión mayor de Prisma.

## Integraciones y trabajo pendiente

- **Búsqueda (RF09/CU07):** obtener el nombre mediante un contrato seguro de Auth y proteger la consulta con autenticación. Actualmente `GET /tutores` es pública y no incluye el nombre.
- **Postulaciones:** acordar y comprobar el endpoint real de asignación de rol TUTOR. La llamada simulada en pruebas no confirma su compatibilidad con Auth.
- **Disponibilidad:** comprobar la reserva y liberación desde Agendamiento. El PATCH actual solo cambia estados; no registra una operación propietaria ni verifica sesiones, habilitación por materia o solapamientos entre sesiones. El contrato nuevo de reservas se retiró y quedó para más adelante.
- **Reputación:** verificar que Agendamiento envíe las calificaciones recibidas como tutor en sesiones completadas y que reintente los eventos conservando su identificador. El receptor está probado; el recorrido real entre micros sigue pendiente.
- **Identidad:** integrar la consulta de revocaciones, suspensiones e inactividad de Auth. Verificar un JWT localmente no consulta esos estados.
- **Arquitectura:** adaptar los módulos restantes cuando se aborde esa tarea. `EN_REVISION` no suspende la cuenta ni tiene una salida administrativa implementada en este micro.

Estos pendientes deben acompañar la entrega: las pruebas locales no demuestran que la aplicación integrada cumpla todos los requisitos del SRS.
