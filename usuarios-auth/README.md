# Usuarios y autenticación — STP

Alcance actual: **login, emisión de JWT, errores de autenticación, verificación de correo mediante SMTP, protección de endpoints y revocación de sesión**.

## Incluido

- `POST /auth/login` para un usuario existente.
- Consulta del usuario por correo y comprobación de su contraseña contra el hash almacenado.
- Respuesta con datos públicos, sin exponer la contraseña ni su hash.
- Emisión de un JWT firmado después de validar las credenciales.
- Errores de entrada y credenciales con códigos estables para Web y Móvil.
- Generación y envío de enlaces de verificación de correo de un solo uso.
- Confirmación y reenvío de verificación para usuarios existentes.

El login emite JWT Bearer asociados a una sesión persistida. Los endpoints de usuarios, roles, relaciones usuario-rol y el CRUD básico de verificaciones requieren una sesión activa. Login y verificación de correo permanecen públicos. La sesión puede cerrarse explícitamente y expira al superar el tiempo de inactividad configurado.

El registro institucional, la generación y almacenamiento del hash de contraseña, y la gestión completa de perfil y roles corresponden a Agustín y no se implementan como parte de estas tareas. Se conservan sus rutas básicas previas `GET/POST /usuarios`, `GET/POST /roles` y `GET/POST /usuario-rol`, con sus DTO y métodos originales. El CRUD previo de usuarios recibe `password_hash`; no equivale al registro institucional con protección de contraseña pendiente.

La validación nueva está limitada al controlador de autenticación para no cambiar los contratos previos. Las respuestas JSON convierten los identificadores `BigInt` a texto.

También se conserva el CRUD original `GET/POST /verificacion-correo`. El flujo seguro nuevo se expone por rutas separadas bajo `/auth`, sin modificar los contratos previos de tu compañero.

## Configuración

Requisitos: Node.js 24 y PostgreSQL. Desde `usuarios-auth`:

```powershell
Copy-Item .env.example .env
npm ci
```

Configurar `DATABASE_URL`, `JWT_SECRET`, las variables `SMTP_*`, `EMAIL_VERIFICATION_URL` y `EMAIL_VERIFICATION_SECRET`. `PORT`, `JWT_ACCESS_TTL_SECONDS`, `JWT_IDLE_TIMEOUT_SECONDS` y `EMAIL_VERIFICATION_TTL_MINUTES` son opcionales.

`JWT_SECRET` debe ser distinto en cada ambiente y contener al menos 32 bytes. No debe subirse en `.env`. `JWT_ACCESS_TTL_SECONDS` acepta entre 60 y 86400 segundos y utiliza 1800 segundos por defecto.

`JWT_IDLE_TIMEOUT_SECONDS` acepta entre 60 y 86400 segundos y utiliza 1800 segundos por defecto. La expiración del token es absoluta; la sesión también deja de aceptarse si pasa ese tiempo sin actividad.

`EMAIL_VERIFICATION_SECRET` también debe ser aleatorio, distinto por ambiente y contener al menos 32 bytes. Se utiliza para proteger los tokens almacenados. `EMAIL_VERIFICATION_URL` corresponde a la pantalla Web o Móvil que recibe el token del enlace y llama al endpoint de confirmación. Los tokens duran 30 minutos por defecto.

Para una base nueva y vacía:

```powershell
npm run db:migrate
npm run start:dev
```

La primera migración crea las tablas base. La migración `20260927000100_sesiones_jwt` agrega la tabla de sesiones requerida para validar y revocar JWT. Si las tablas base ya existen y coinciden con `20260916000100_esquema_inicial`, respaldar y comprobar el esquema antes de marcar esa migración como aplicada mediante `npx prisma migrate resolve --applied 20260916000100_esquema_inicial`; después ejecutar `npm run db:migrate` para crear la tabla de sesiones.

Para probar el login manualmente debe existir un usuario con una contraseña almacenada como hash Argon2. La creación de ese usuario corresponde al registro de tu compañero. El verificador actual usa Argon2; se debe mantener el mismo algoritmo en ambos flujos al integrarlos.

## POST /auth/login

```json
{
  "correo_institucional": "estudiante@alu.uct.cl",
  "password": "contraseña del usuario existente"
}
```

Devuelve `200` con `usuario`, `access_token`, `token_type: "Bearer"`, `expires_in` y el mensaje `Autenticación exitosa.`. `usuario` contiene id como texto, nombre, correo, estado de cuenta, indicador de verificación y roles. Nunca se devuelve la contraseña ni su hash.

El JWT usa HS256 e incluye `sub`, `jti`, `correo_institucional` y `roles`, además de las marcas estándar de emisión, expiración, emisor y audiencia. La expiración es absoluta y cada token queda asociado a una sesión persistida, que también puede vencer por inactividad o revocarse al cerrar sesión.

Credenciales incorrectas producen `401` con el código `AUTH_INVALID_CREDENTIALS`. Los datos inválidos producen `400` con `AUTH_INVALID_REQUEST` y una lista de detalles. Ambos casos evitan revelar si el correo existe.

Los clientes consumirán este endpoint mediante el API Gateway. Los endpoints protegidos verifican el token y su sesión activa; la autorización por rol se define en una tarea separada.

## Protección de endpoints y cierre de sesión

Las rutas `GET/POST /usuarios`, `GET/POST /roles`, `GET/POST /usuario-rol` y `GET/POST /verificacion-correo` requieren el encabezado `Authorization: Bearer <access_token>`. Login, verificación y reenvío de correo permanecen disponibles sin token.

`POST /auth/logout` requiere un token vigente y responde `204`. Revoca la sesión asociada; los siguientes usos del mismo JWT reciben `401 AUTH_SESSION_INVALID`. Las sesiones también dejan de aceptarse después del tiempo máximo sin actividad. El guard valida algoritmo HS256, emisor y audiencia antes de consultar la sesión.

Esta protección valida autenticación. Las reglas de autorización por rol, y la integración con suspensión de cuentas, corresponden a trabajos separados.

## POST /auth/reenviar-verificacion

```json
{
  "correo_institucional": "estudiante@alu.uct.cl"
}
```

Devuelve `202` con un mensaje genérico, tanto si la cuenta no existe como si ya se encuentra verificada. Para una cuenta existente no verificada genera un token aleatorio, guarda únicamente su HMAC y envía el enlace mediante SMTP. El método interno `solicitarVerificacion(idUsuario, correo)` queda disponible para que el registro lo invoque cuando esa tarea se integre.

## POST /auth/verificar-correo

```json
{
  "token": "token-de-64-caracteres-recibido-en-el-enlace"
}
```

Un token válido marca `correo_verificado` como `true`. Si la cuenta se encuentra `INACTIVO`, la habilita como `ACTIVO`; no reactiva cuentas con otros estados. La confirmación y el consumo del token se ejecutan en una transacción para impedir su reutilización.

Los tokens inválidos, vencidos o utilizados producen errores controlados. Un fallo de entrega SMTP devuelve `503 EMAIL_DELIVERY_FAILED` y elimina el token que no pudo enviarse.

## Comprobación

```powershell
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Las pruebas HTTP usan los controladores, servicios y guard reales con persistencia y entrega SMTP simuladas. Comprueban login, firma JWT, emisión y confirmación de tokens de correo, errores controlados, rechazo de solicitudes sin sesión, expiración por inactividad y logout sin afectar otras sesiones. También comprueban que los CRUD originales sigan aceptando sus contratos con autenticación. No generan contraseñas, no escriben datos reales y no envían correos externos. No sustituyen una prueba manual contra PostgreSQL y un servidor SMTP configurado.

Se mantiene `.gitignore` para secretos, dependencias, compilados y cachés. Se conservan las plantillas y `package-lock.json`.
