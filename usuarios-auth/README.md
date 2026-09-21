# Usuarios y autenticación — STP

Alcance actual: **login, emisión de JWT y manejo de errores de autenticación**.

## Incluido

- `POST /auth/login` para un usuario existente.
- Consulta del usuario por correo y comprobación de su contraseña contra el hash almacenado.
- Respuesta con datos públicos, sin exponer la contraseña ni su hash.
- Emisión de un JWT firmado después de validar las credenciales.
- Errores de entrada y credenciales con códigos estables para Web y Móvil.

El login emite el token que se utilizará posteriormente como Bearer. Esta entrega todavía no protege endpoints, no mantiene una sesión en base de datos y no revoca tokens. Lee los roles existentes para incorporarlos al token, pero no los crea, asigna ni modifica.

El registro institucional, la generación y almacenamiento del hash de contraseña, y la gestión completa de perfil y roles corresponden a Agustín y no se implementan como parte de estas tareas. Se conservan sus rutas básicas previas `GET/POST /usuarios`, `GET/POST /roles` y `GET/POST /usuario-rol`, con sus DTO y métodos originales. El CRUD previo de usuarios recibe `password_hash`; no equivale al registro institucional con protección de contraseña pendiente. SMTP, protección de endpoints y revocación quedan para sus tareas posteriores.

La validación nueva está limitada al controlador de autenticación para no cambiar los contratos previos. Las respuestas JSON convierten los identificadores `BigInt` a texto.

También se conserva el CRUD original `GET/POST /verificacion-correo`, sin agregar envío SMTP, activación ni reenvío de enlaces.

## Configuración

Requisitos: Node.js 24 y PostgreSQL. Desde `usuarios-auth`:

```powershell
Copy-Item .env.example .env
npm ci
```

Configurar `DATABASE_URL`, `JWT_SECRET` y, opcionalmente, `PORT` y `JWT_ACCESS_TTL_SECONDS`. No se requieren dominios de registro ni SMTP.

`JWT_SECRET` debe ser distinto en cada ambiente y contener al menos 32 bytes. No debe subirse en `.env`. `JWT_ACCESS_TTL_SECONDS` acepta entre 60 y 86400 segundos y utiliza 1800 segundos por defecto.

Para una base nueva y vacía:

```powershell
npm run db:migrate
npm run start:dev
```

La migración inicial reproduce las tablas del esquema previo; no crea cuentas ni roles. Si las tablas ya existen y coinciden con `20260916000100_esquema_inicial`, respaldar y comprobar el esquema antes de marcar esa migración como aplicada mediante `npx prisma migrate resolve --applied 20260916000100_esquema_inicial`.

Para probar el login manualmente debe existir un usuario con una contraseña almacenada como hash Argon2. La creación de ese usuario corresponde al registro de tu compañero. El verificador actual usa Argon2; se debe mantener el mismo algoritmo en ambos flujos al integrarlos.

## POST /auth/login

```json
{
  "correo_institucional": "estudiante@alu.uct.cl",
  "password": "contraseña del usuario existente"
}
```

Devuelve `200` con `usuario`, `access_token`, `token_type: "Bearer"`, `expires_in` y el mensaje `Autenticación exitosa.`. `usuario` contiene id como texto, nombre, correo, estado de cuenta, indicador de verificación y roles. Nunca se devuelve la contraseña ni su hash.

El JWT usa HS256 e incluye únicamente `sub`, `correo_institucional` y `roles`, además de las marcas estándar de emisión, expiración, emisor y audiencia. La expiración actual es absoluta; el control por inactividad y la revocación pertenecen a tareas posteriores.

Credenciales incorrectas producen `401` con el código `AUTH_INVALID_CREDENTIALS`. Los datos inválidos producen `400` con `AUTH_INVALID_REQUEST` y una lista de detalles. Ambos casos evitan revelar si el correo existe.

Los clientes consumirán este endpoint mediante el API Gateway. El módulo no incorpora todavía guards, autorización ni revocación de sesiones.

## Comprobación

```powershell
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Las pruebas HTTP usan los controladores y servicios reales con persistencia simulada. Comprueban el login con un usuario y un hash ficticios preexistentes, y que los CRUD originales restaurados vuelvan a aceptar sus contratos y serializar identificadores. No generan contraseñas ni escriben datos reales. No requieren PostgreSQL ni SMTP, y no sustituyen una prueba de integración contra PostgreSQL.

Se mantiene `.gitignore` para secretos, dependencias, compilados y cachés. Se conservan las plantillas y `package-lock.json`.
