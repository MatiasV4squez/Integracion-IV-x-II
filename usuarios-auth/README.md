# Usuarios y autenticación — STP

Auth se organiza en tres capas de arquitectura hexagonal:

```text
src/auth/
├── dominio/          # Contratos, identidad y validación de identificadores
├── aplicacion/       # Login, sesiones y moderación
├── infraestructura/
│   ├── http/         # Controladores, guards y DTO de peticiones
│   ├── seguridad/    # Adaptadores JWT y Argon2, con su prueba de contraseñas
│   └── persistencia/ # Adaptador Prisma para sesiones y estado de cuenta
└── auth.module.ts    # Conecta los puertos con sus adaptadores
```

- **Dominio**: `auth.ports.ts` agrupa los contratos y la identidad autenticada; las reglas compartidas no dependen de NestJS, Prisma ni JWT.
- **Aplicación**: `AuthService` coordina login; `SessionService` controla el ciclo de sesión; `ModeracionCuentasService` coordina el estado de cuentas. Sus dependencias de persistencia, contraseña y token se expresan mediante interfaces.
- **Infraestructura**: `http` agrupa controladores, guards y DTO; `seguridad` contiene `PasswordService` y `TokenService`, que encapsulan Argon2 y JWT; `persistencia` contiene `PrismaAuthRepository`, que implementa los dos contratos de persistencia con una sola instancia y mantiene las transacciones.
- **Composición**: `auth.module.ts` registra las implementaciones. `UsuariosPersistenceModule` comparte el repositorio existente entre Usuarios y Auth sin dependencias circulares.

La respuesta del login tiene un tipo explícito. La actividad de sesión utiliza un objeto con campos nombrados para distinguir el instante actual del límite de inactividad. El repositorio comparte el filtro de sesión y utiliza un bloque explícito para revocar al suspender.

Auth contiene 19 archivos, incluidas sus dos pruebas unitarias. Los consumidores importan el guard y el DTO de correo directamente desde `infraestructura/http`, sin archivos puente. La separación en subcarpetas organiza los adaptadores por función y conserva los contratos y las operaciones existentes. Ambos endpoints de login delegan en el mismo servicio y se conserva la validación global anterior de `main.ts`.

## Endpoints de Auth

| Método y ruta                                | Acceso                   | Resultado                                       |
| -------------------------------------------- | ------------------------ | ----------------------------------------------- |
| `POST /auth/login`                           | Público                  | JWT y datos públicos del usuario.               |
| `POST /usuarios/login`                       | Público                  | Mismo flujo y respuesta que Auth.               |
| `GET /auth/sesion`                           | JWT y sesión vigentes    | Identidad y registro de actividad.              |
| `POST /auth/logout`                          | JWT y sesión vigentes    | Revoca la sesión actual; responde 204.          |
| `PATCH /internal/usuarios/:id/estado-cuenta` | `x-internal-service-key` | Cambia el estado y devuelve sesiones revocadas. |

El login recibe `correo_institucional` y `password`. Devuelve `usuario`, `access_token`, `token_type`, `expires_in` y `mensaje`, sin incluir la contraseña ni su hash.

Se rechazan credenciales incorrectas (401), cuentas suspendidas (403) y cuentas inactivas (403). Una cuenta ACTIVO con correo aún sin verificar conserva el acceso anterior; conectar registro y verificación de correo queda como tarea separada.

El guard verifica HS256, emisor, audiencia e identidad, además de la sesión persistida, su expiración, revocación y estado vigente de la cuenta. El token tiene vencimiento absoluto. Una sesión inactiva se revoca cuando se intenta utilizar nuevamente.

El endpoint interno admite `{ "estado": "SUSPENDIDO" }` o `{ "estado": "ACTIVO" }`. Suspensión y revocación se realizan en una transacción. Login y suspensión toman el mismo bloqueo de cuenta para impedir la creación de sesiones después de suspender. Reactivar no recupera sesiones revocadas: requiere un login nuevo.

## Alcance

En `roles`, `usuario-rol` y `verificacion-correo` solo se actualizaron los imports del guard en sus pruebas y del DTO compartido de correo. Sus rutas CRUD y su autorización quedan pendientes de la decisión del equipo sobre esos módulos. Se mantiene el flujo de verificación existente bajo `/auth/reenviar-verificacion` y `/auth/verificar-correo`.

El registro conserva su implementación y la validación global existente. No envía automáticamente el enlace de verificación. Las antiguas rutas raíz GET/POST /usuarios no forman parte del controlador actual.

## Configuración y comprobación

Se conservan las variables de `.env.example`: PostgreSQL, secretos JWT e interno, tiempos de sesión y configuración de correo. El modelo Sesion corresponde a la migración existente `20260927000100_sesiones_jwt`. No se agregó una migración ni se aplicaron cambios a la base de datos.

Desde `usuarios-auth`:

```powershell
npm run prisma:generate
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Si la base todavía no tiene la tabla de sesiones, aplicar las migraciones pendientes mediante `npm run db:migrate`. El rol ESTUDIANTE debe existir para registrar usuarios; su inicialización está en `prisma/seed.ts`.

Las pruebas HTTP usan validación global, controladores, adaptadores y guards reales con Prisma y SMTP simulados. Cubren login, sesiones, logout, inactividad, suspensión/reactivación y credenciales internas. Las pruebas de AuthService permiten sustituir adaptadores y comprueban que no se entregue un token si falla la creación de su sesión.

Quedan pendientes las pruebas contra PostgreSQL y SMTP reales y la integración completa con Reportes.
