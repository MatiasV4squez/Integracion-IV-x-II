# Usuarios y autenticación — STP

Alcance de esta entrega: **módulo de autenticación y login básico**.

## Incluido

- `POST /auth/login` para un usuario existente.
- Consulta del usuario por correo y comprobación de su contraseña contra el hash almacenado.
- Respuesta con datos públicos, sin exponer la contraseña ni su hash.
- Validación básica de la solicitud y respuesta `401` ante credenciales incorrectas.

El login solo valida credenciales: todavía no crea una sesión ni concede acceso a recursos protegidos. Lee los roles existentes, pero no los crea, asigna ni modifica.

El registro institucional, la generación y almacenamiento del hash de contraseña, y la gestión completa de perfil y roles corresponden a Agustín y no se implementan como parte del login. Se restauraron sus rutas básicas previas `GET/POST /usuarios`, `GET/POST /roles` y `GET/POST /usuario-rol`, con sus DTO y métodos originales. El CRUD previo de usuarios recibe `password_hash`; no equivale al registro institucional con protección de contraseña pendiente. JWT, SMTP, protección de endpoints y revocación quedan para sus tareas posteriores.

La validación nueva está limitada al controlador de autenticación para no cambiar los contratos previos. Las respuestas JSON convierten los identificadores `BigInt` a texto.

También se conserva el CRUD original `GET/POST /verificacion-correo`, sin agregar envío SMTP, activación ni reenvío de enlaces.

## Configuración

Requisitos: Node.js 24 y PostgreSQL. Desde `usuarios-auth`:

```powershell
Copy-Item .env.example .env
npm ci
```

Configurar `DATABASE_URL` y, opcionalmente, `PORT`. No se requieren dominios de registro ni SMTP.

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

Devuelve `200` con `usuario` y el mensaje `Credenciales válidas.`. `usuario` contiene id como texto, nombre, correo, estado de cuenta, indicador de verificación y roles. Nunca se devuelve la contraseña ni su hash. Credenciales incorrectas producen `401` con un mensaje común; los datos inválidos producen `400`. No se emite JWT.

Los clientes consumirán este endpoint mediante el API Gateway. El módulo no incorpora todavía guards ni manejo de sesiones.

## Comprobación

```powershell
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Las pruebas HTTP usan los controladores y servicios reales con persistencia simulada. Comprueban el login con un usuario y un hash ficticios preexistentes, y que los CRUD originales restaurados vuelvan a aceptar sus contratos y serializar identificadores. No generan contraseñas ni escriben datos reales. No requieren PostgreSQL ni SMTP, y no sustituyen una prueba de integración contra PostgreSQL.

Se mantiene `.gitignore` para secretos, dependencias, compilados y cachés. Se conservan las plantillas y `package-lock.json`.
