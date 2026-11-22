# Usuarios y autenticación — STP

Auth se organiza en tres capas de arquitectura hexagonal:

```text
src/auth/
├── dominio/          # Contratos, identidad y validación de identificadores
├── aplicacion/       # Login, sesiones, moderación y asignación de TUTOR
├── infraestructura/
│   ├── http/         # Controladores, guards y DTO de peticiones
│   ├── seguridad/    # Adaptadores JWT y Argon2, con su prueba de contraseñas
│   └── persistencia/ # Adaptadores Prisma para sesiones, estado de cuenta y roles
└── auth.module.ts    # Conecta los puertos con sus adaptadores
```

- **Dominio**: `auth.ports.ts` agrupa los contratos y la identidad autenticada; las reglas compartidas no dependen de NestJS, Prisma ni JWT.
- **Aplicación**: `AuthService` coordina login; `SessionService` controla el ciclo de sesión; `ModeracionCuentasService` coordina el estado de cuentas. Sus dependencias de persistencia, contraseña y token se expresan mediante interfaces.
- **Infraestructura**: `http` agrupa controladores, guards y DTO; `seguridad` contiene `PasswordService` y `TokenService`, que encapsulan Argon2 y JWT; `persistencia` contiene `PrismaAuthRepository`, que implementa los dos contratos de persistencia con una sola instancia y mantiene las transacciones.
- **Composición**: `auth.module.ts` registra las implementaciones. `UsuariosPersistenceModule` comparte el repositorio existente entre Usuarios y Auth sin dependencias circulares.

La respuesta del login tiene un tipo explícito. La actividad de sesión utiliza un objeto con campos nombrados para distinguir el instante actual del límite de inactividad. El repositorio comparte el filtro de sesión y utiliza un bloque explícito para revocar al suspender.

Los consumidores importan el guard y el DTO de correo directamente desde `infraestructura/http`, sin archivos puente. La separación en subcarpetas organiza los adaptadores por función y conserva los contratos y las operaciones existentes. Ambos endpoints de login delegan en el mismo servicio y se conserva la validación global anterior de `main.ts`.

## Endpoints de Auth

| Método y ruta                                | Acceso                   | Resultado                                       |
| -------------------------------------------- | ------------------------ | ----------------------------------------------- |
| `POST /usuarios/registro` | Público | Cuenta inactiva y solicitud automática del primer enlace. |
| `POST /auth/login`                           | Público                  | JWT y datos públicos del usuario.               |
| `POST /usuarios/login`                       | Público                  | Mismo flujo y respuesta que Auth.               |
| `GET /usuarios/:id` | JWT y sesión vigentes | Datos públicos de un usuario; 404 si no existe. |
| `GET /usuarios?ids=2,3,7` | JWT y sesión vigentes | Datos públicos por lote en una sola consulta. |
| `GET /auth/sesion`                           | JWT y sesión vigentes    | Identidad y registro de actividad.              |
| `POST /auth/logout`                          | JWT y sesión vigentes    | Revoca la sesión actual; responde 204.          |
| `PATCH /internal/usuarios/:id/estado-cuenta` | `x-internal-service-key` | Cambia el estado y devuelve sesiones revocadas. |
| `POST /internal/usuarios/roles` | `X-Integracion-Secret` | Asigna TUTOR de forma idempotente; responde 200. |

El login recibe `correo_institucional` y `password`. Devuelve `usuario`, `access_token`, `token_type`, `expires_in` y `mensaje`, sin incluir la contraseña ni su hash.

Se rechazan credenciales incorrectas (401), cuentas suspendidas (403), correos sin verificar (403, `AUTH_EMAIL_NOT_VERIFIED`) y cuentas inactivas (403). La creación y validación de sesiones en Auth exigen cuenta ACTIVO y correo verificado, incluidas las cuentas anteriores al cambio.

El guard verifica HS256, emisor, audiencia e identidad, además de la sesión persistida, su expiración, revocación y estado vigente de la cuenta. El token tiene vencimiento absoluto. Una sesión inactiva se revoca cuando se intenta utilizar nuevamente.

El endpoint interno admite `{ "estado": "SUSPENDIDO" }` o `{ "estado": "ACTIVO" }`. Suspensión y revocación se realizan en una transacción. Login y suspensión toman el mismo bloqueo de cuenta para impedir la creación de sesiones después de suspender. Reactivar no recupera sesiones revocadas: requiere un login nuevo.

## Registro y activación (S1)

- El registro normaliza nombre y correo, valida el dominio institucional, guarda la contraseña hasheada y crea `INACTIVO`, `correo_verificado=false` y rol ESTUDIANTE. Después solicita el primer enlace mediante el servicio de verificación existente.
- La respuesta sigue siendo 201 con `id`, `nombre`, `correo` y `estado`; añade `verificacion` y `mensaje`. `ENLACE_GENERADO` indica que el adaptador SMTP o de logs procesó el enlace. No se devuelve el token ni un JWT.
- Si falla la entrega, conserva la cuenta inactiva y responde 201 con `verificacion=PENDIENTE_ENVIO`. Se recupera con `POST /auth/reenviar-verificacion`, sin repetir el registro. El error interno de SMTP no se expone.
- La confirmación válida marca el correo como verificado y activa solo cuentas INACTIVO; una cuenta suspendida permanece suspendida. Se conservan vencimiento, uso único y respuestas de error de los enlaces.
- Con `SMTP_DISABLED=true`, el primer enlace aparece automáticamente en los logs de Auth; con `false`, se envía por SMTP. No se cambian los datos de las cuentas existentes ni se requieren migraciones. La adaptación de Web corresponde a S2.

## Asignación de TUTOR (U1)

- **Contrato:** `POST /internal/usuarios/roles`, cuerpo `{ "idUsuario": "12", "rol": "TUTOR" }` y respuesta 200 con el mismo cuerpo, incluso al repetir. Solo admite TUTOR e IDs de texto positivos dentro del rango BIGINT.
- **Credenciales:** Materias/Tutores envía `X-Integracion-Secret`; ambos micros deben compartir `INTEGRACION_SECRET` (mínimo 32 bytes). Sin configurarlo, Auth arranca pero este endpoint responde 401. Moderación conserva `X-Internal-Service-Key` / `INTERNAL_SERVICE_API_KEY`.
- **URL en Materias/Tutores:** `USUARIOS_AUTH_ASIGNAR_TUTOR_URL=http://usuarios-auth:3000/internal/usuarios/roles`; en local, reemplazar `usuarios-auth` por `localhost`.
- **Errores:** 400 para datos inválidos, 401 para credenciales inválidas, 404 sin usuario y 503 sin rol TUTOR (aplicar `npm run db:migrate`).
- **Arquitectura:** controlador → `AsignarTutorUseCase` → `RolesRepository` → `PrismaRolesRepository`. El caso de uso no depende de NestJS ni Prisma. La inserción transaccional con `skipDuplicates` tolera reintentos y concurrencia sin quitar roles anteriores.
- **JWT y reintentos:** volver a iniciar sesión para obtener TUTOR en el JWT. Las postulaciones `PENDIENTE_ROL` se recuperan con `POST /postulaciones/:id/reintentar-rol` en Materias/Tutores.

## Datos públicos de usuarios (U2)

- Ambos GET requieren `Authorization: Bearer <JWT>` y una sesión vigente. Cualquier usuario autenticado puede consultar a otros usuarios.
- Respuesta individual: `{ "id": "12", "nombre": "Ana", "carrera": null, "semestre_actual": null, "biografia": null }`. Solo se devuelven esos cinco campos; el ID viaja como texto y los datos opcionales ausentes como `null`.
- El lote exige `ids` con entre 1 y 100 IDs positivos dentro del rango BIGINT, separados por comas. Conserva el orden solicitado, ignora duplicados y omite usuarios inexistentes; si ninguno existe, responde `200 []`. Datos inválidos: 400; JWT o sesión inválidos: 401; usuario individual inexistente: 404.
- `UsuariosController` → `ConsultarDatosPublicosUseCase` → puerto `DatosPublicosRepository` → adaptador `PrismaUsuarioRepository` existente. El caso de uso no depende de NestJS ni Prisma; la consulta selecciona solo los campos públicos y no carga correo, hash ni relaciones privadas. El mismo caso de uso sirve para consultas individuales y por lote.

## Organización de usuarios

- `aplicacion` contiene registro y consulta pública sin NestJS, Prisma ni Argon2. HTTP y DTO están en `infraestructura/http`; Prisma y su módulo están en `infraestructura/persistencia`.
- El registro usa un puerto de hash implementado por el mismo adaptador de contraseñas que Auth. Se conserva el módulo de persistencia separado para compartirlo con login sin crear dependencias circulares.
- El contrato de registro conserva `password_hash` como campo de entrada; HTTP lo transforma a los datos del caso de uso y nunca devuelve el hash. Un correo repetido responde 409, también ante registros concurrentes.
- Se retiraron `UsuariosService`, su prueba de plantilla, los DTO de actualización y la entidad vacía sin consumidores. El puerto de usuarios conserva únicamente las operaciones de registro y búsqueda por correo; el puerto de datos públicos mantiene la consulta por lote.

## Verificación de correo (U4)

- Local sin SMTP: `SMTP_DISABLED=true` registra el enlace en el log del servidor y permite iniciar sin variables SMTP.
- Con Mailpit: ejecutar `docker compose up -d mailpit` y usar `SMTP_DISABLED=false`, `SMTP_HOST=localhost`, puerto `1025`, `SMTP_SECURE=false` y credenciales vacías. Si Auth corre en la misma red Compose, usar `SMTP_HOST=mailpit`. Bandeja: http://localhost:8025.
- `EMAIL_VERIFICATION_URL=http://localhost:5173/verificar-cuenta` para la web local; configurar la URL pública del frontend en producción.
- Producción: `SMTP_DISABLED=false` y datos del SMTP institucional (host, puerto, seguridad, remitente y credenciales según corresponda). Se rechaza el modo de logs en producción.
- Se reutilizan el puerto de envío y el servicio de verificación existentes; el módulo selecciona el adaptador SMTP o el de logs.
- Organización: `aplicacion` coordina solicitar y confirmar mediante puertos de `dominio`; `infraestructura` contiene HTTP/DTO, Prisma, SMTP/logs y criptografía. La aplicación recibe configuración simple y no importa NestJS ni Prisma. El controlador traduce los errores a los mismos códigos HTTP y la confirmación conserva su transacción.

## Swagger (U5)

Swagger se publica en `/api` solo cuando `NODE_ENV` es distinto de `production`. En producción no se registran la interfaz ni las rutas de documentación JSON/YAML.

- Local: configurar `NODE_ENV=development` en el `.env` de `usuarios-auth`; `.env.example` sirve como plantilla.
- Despliegue: definir explícitamente `NODE_ENV=production` en las variables del servidor o su `.env` y configurar el SMTP de producción descrito en U4.
- `npm run start:prod` no establece `NODE_ENV`. Si se omite o tiene otro valor, Swagger permanece habilitado. Reiniciar Auth después de cambiar las variables.

## Alcance

Las rutas CRUD y la autorización de `roles` y `usuario-rol` siguen pendientes de la decisión del equipo. Se retiró el CRUD antiguo `GET/POST /verificacion-correo`, sin consumidores encontrados en el proyecto; ambas rutas responden 404. La verificación se mantiene bajo `/auth/reenviar-verificacion` y `/auth/verificar-correo`.

`GET /usuarios` consulta únicamente los IDs solicitados; no expone un listado general. La antigua ruta raíz `POST /usuarios` no forma parte del controlador actual.

## Configuración y comprobación

Se conservan las variables de `.env.example`: PostgreSQL, secretos JWT e interno, tiempos de sesión y configuración de correo. El modelo Sesion corresponde a la migración existente `20260927000100_sesiones_jwt`. La migración `20261031000000_roles_base` agrega los roles base.

Desde `usuarios-auth`:

```powershell
npm run prisma:generate
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Antes de iniciar la aplicación o registrar usuarios, aplicar las migraciones pendientes mediante `npm run db:migrate`.

### Roles base (U3)

La migración `20261031000000_roles_base` garantiza estos roles:

- `ESTUDIANTE`
- `TUTOR`
- `ADMINISTRADOR`

```powershell
npm run db:migrate
```

La inserción es idempotente por nombre: conserva los roles existentes, sus IDs y las relaciones con usuarios. Los IDs son generados por PostgreSQL; el registro conecta `ESTUDIANTE` por nombre, sin asumir un ID fijo.

La creación de roles es responsabilidad de las migraciones de persistencia. El arranque de la aplicación no crea roles y el servicio antiguo `UsuariosService` fue retirado. `prisma/seed.ts` queda como utilidad manual opcional y no es necesario para completar U3.

Para comprobar esta migración en una base de prueba: aplicarla con la tabla de roles vacía y con roles y asignaciones existentes; repetir su SQL y verificar que no aparezcan duplicados ni cambien los IDs o las asignaciones existentes.

Las pruebas HTTP usan validación global, controladores, adaptadores y guards reales con Prisma y SMTP simulados. Cubren login, sesiones, logout, inactividad, suspensión/reactivación, asignación idempotente de TUTOR y separación de credenciales internas. Las pruebas de AuthService permiten sustituir adaptadores y comprueban que no se entregue un token si falla la creación de su sesión. Las de AsignarTutorUseCase comprueban IDs BIGINT y errores mediante un puerto sustituido.

También se realizaron comprobaciones locales con PostgreSQL, Mailpit y el SMTP configurado, separadas de las suites automatizadas anteriores: registro/login, asignación de TUTOR desde Materias/Tutores y confirmación de correo con concurrencia y rollback. La integración completa con Reportes sigue pendiente.
