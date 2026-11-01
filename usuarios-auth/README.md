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
| `POST /auth/login`                           | Público                  | JWT y datos públicos del usuario.               |
| `POST /usuarios/login`                       | Público                  | Mismo flujo y respuesta que Auth.               |
| `GET /usuarios/:id` | JWT y sesión vigentes | Datos públicos de un usuario; 404 si no existe. |
| `GET /usuarios?ids=2,3,7` | JWT y sesión vigentes | Datos públicos por lote en una sola consulta. |
| `GET /auth/sesion`                           | JWT y sesión vigentes    | Identidad y registro de actividad.              |
| `POST /auth/logout`                          | JWT y sesión vigentes    | Revoca la sesión actual; responde 204.          |
| `PATCH /internal/usuarios/:id/estado-cuenta` | `x-internal-service-key` | Cambia el estado y devuelve sesiones revocadas. |
| `POST /internal/usuarios/roles` | `X-Integracion-Secret` | Asigna TUTOR de forma idempotente; responde 200. |

El login recibe `correo_institucional` y `password`. Devuelve `usuario`, `access_token`, `token_type`, `expires_in` y `mensaje`, sin incluir la contraseña ni su hash.

Se rechazan credenciales incorrectas (401), cuentas suspendidas (403) y cuentas inactivas (403). Una cuenta ACTIVO con correo aún sin verificar conserva el acceso anterior; conectar registro y verificación de correo queda como tarea separada.

El guard verifica HS256, emisor, audiencia e identidad, además de la sesión persistida, su expiración, revocación y estado vigente de la cuenta. El token tiene vencimiento absoluto. Una sesión inactiva se revoca cuando se intenta utilizar nuevamente.

El endpoint interno admite `{ "estado": "SUSPENDIDO" }` o `{ "estado": "ACTIVO" }`. Suspensión y revocación se realizan en una transacción. Login y suspensión toman el mismo bloqueo de cuenta para impedir la creación de sesiones después de suspender. Reactivar no recupera sesiones revocadas: requiere un login nuevo.

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

## Alcance

En `roles`, `usuario-rol` y `verificacion-correo` solo se actualizaron los imports del guard en sus pruebas y del DTO compartido de correo. Sus rutas CRUD y su autorización quedan pendientes de la decisión del equipo sobre esos módulos. Se mantiene el flujo de verificación existente bajo `/auth/reenviar-verificacion` y `/auth/verificar-correo`.

El registro conserva su implementación y la validación global existente. No envía automáticamente el enlace de verificación. `GET /usuarios` consulta únicamente los IDs solicitados; no expone un listado general. La antigua ruta raíz `POST /usuarios` no forma parte del controlador actual.

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

La creación de roles es responsabilidad de las migraciones de persistencia. Se retiró el inicializador de `UsuariosService`; el arranque de la aplicación no crea roles. `prisma/seed.ts` queda como utilidad manual opcional y no es necesario para completar U3.

Para comprobar esta migración en una base de prueba: aplicarla con la tabla de roles vacía y con roles y asignaciones existentes; repetir su SQL y verificar que no aparezcan duplicados ni cambien los IDs o las asignaciones existentes.

Las pruebas HTTP usan validación global, controladores, adaptadores y guards reales con Prisma y SMTP simulados. Cubren login, sesiones, logout, inactividad, suspensión/reactivación, asignación idempotente de TUTOR y separación de credenciales internas. Las pruebas de AuthService permiten sustituir adaptadores y comprueban que no se entregue un token si falla la creación de su sesión. Las de AsignarTutorUseCase comprueban IDs BIGINT y errores mediante un puerto sustituido.

Quedan pendientes las pruebas de los flujos de login, sesiones y verificación contra PostgreSQL y SMTP reales y la integración completa con Reportes.
