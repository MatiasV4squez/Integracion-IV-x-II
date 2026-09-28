# Solicitudes de sesiones

RF12 y RF15: aceptar, rechazar y cancelar con permisos BR14, transiciones BR02,
solapamientos BR01 y límite temporal BR15. Se conserva el límite de cuatro
pendientes y la expiración de solicitudes de 24 horas.

## Responsabilidades

`agendamiento-sesiones` persiste sesiones. `materias-tutores` es propietario de los
bloques. Se eliminó `POST /sessions/blocks`, el modelo local `bloque_horario` y la
relación Prisma hacia esa tabla. No hay consultas a la base de otro microservicio.

La carpeta `src/integrations/materias-tutores` contiene exclusivamente el cliente
HTTP y la recuperación de operaciones del consumidor. No implementa la API de
Víctor. El [contrato propuesto](contrato-materias-tutores.md) debe acordarse e
implementarse allí. Las pruebas usan un proveedor simulado, nunca en producción.

## Preparación

1. Usar Node.js 24.9 o superior para las pruebas.
2. Configurar PostgreSQL y `JWT_SECRET` en `.env`.
3. Ejecutar `npm run prisma:deploy` y `npm run prisma:generate`.
4. Cuando esté disponible el proveedor, configurar `MATERIAS_TUTORES_URL`,
   `MATERIAS_TUTORES_TOKEN` y opcionalmente `MATERIAS_TUTORES_TIMEOUT_MS` (4000 por
   defecto, máximo 5000). Sin URL/token, crear devuelve 503 sin escribir reservas.

La migración `20260927120000_separar_bloques` comprueba ambas tablas antiguas con
bloqueo y dentro de una transacción. Solo reemplaza tablas vacías. Si encuentra
sesiones o bloques UUID se detiene sin borrar datos: hace falta acordar su mapeo
con materias-tutores y adaptar la migración antes de aplicarla. No usar reset,
truncate ni asignar números arbitrarios a datos existentes. No se modificaron
las migraciones ya aplicadas.

## Rutas y datos

Todos los identificadores de negocio son enteros positivos BIGINT (máximo
9223372036854775807), representados como texto en JSON y parámetros de ruta.

`POST /sessions` recibe:

```json
{
  "id_tutee": "1",
  "id_tutor": "2",
  "id_materia": "3",
  "id_bloque": "4"
}
```

Solo devuelve 201 después de reservar en materias-tutores y confirmar la
transacción local. Recibe de ese servicio `inicio` y `fin` UTC y conserva esa
instantánea en la sesión. El propietario debe mantener el horario de una reserva
inmutable. El cliente no puede enviar ni cambiar esas fechas.

Las siguientes rutas exigen `Authorization: Bearer <access_token>` y no necesitan
body. JWT HS256, issuer `stp-usuarios-auth`, audience `stp-clients`, `sub` numérico
positivo como texto y `exp` vigente; `JWT_SECRET` mínimo 32 bytes.

| Ruta | Permiso | Transición |
| --- | --- | --- |
| `PATCH /sessions/:id/accept` | Tutor asociado | PENDIENTE → CONFIRMADA |
| `PATCH /sessions/:id/reject` | Tutor asociado | PENDIENTE → RECHAZADA |
| `PATCH /sessions/:id/cancel` | Tutor o estudiante, antes del inicio | CONFIRMADA → CANCELADA |

Devuelven 200 con identificadores como texto, estado, fechas, `inicio`, `fin` y
`estado_reserva`: `RESERVADA`, `LIBERADA` o `LIBERACION_PENDIENTE`. El último valor
significa que el cambio de sesión está confirmado y la liberación remota se
reintentará. No garantiza disponibilidad inmediata del bloque.

| Código | Significado |
| --- | --- |
| 400 | Entrada inválida o cuatro solicitudes pendientes |
| 401 | JWT ausente, inválido o vencido |
| 403 | Usuario sin permiso sobre la sesión |
| 404 | Sesión, bloque o materia inexistente |
| 409 | Estado incompatible, solapamiento, cancelación fuera de plazo o reserva rechazada |
| 502 | Respuesta incompatible con el contrato del proveedor |
| 503 | Integración sin configurar, proveedor caído o timeout |

`fecha_actualizacion` usa `@updatedAt`. Tutor y estudiante no pueden superponer
solicitudes PENDIENTE, CONFIRMADA o PENDIENTE_CIERRE. Se permiten intervalos
adyacentes y se excluye la propia sesión al aceptar. La cancelación compara el
instante UTC con el reloj PostgreSQL, sin reinterpretarlo en la zona de Node.
`SESSION_TIME_ZONE` deja de usarse en sesiones: el propietario convierte su día y
hora local al instante UTC correcto.

## Concurrencia y fallos

Las decisiones locales usan Serializable con tres intentos para P2034 y los
SQLSTATE 40001/40P01 del adaptador. No se hace HTTP dentro de una transacción ni se
repite la reserva remota al reintentar una transacción local.

Antes de llamar al proveedor se persiste una intención `PREPARADA` con UUID de
operación. Tras reservar, se crea la sesión y se marca `ASOCIADA` en una misma
transacción. Si fallan validaciones, red o base de datos, se compensa liberando esa
reserva. Si se pierde el proceso, un trabajo cada minuto recupera intenciones de
más de 60 segundos. Una intención vencida no puede asociarse después.

Rechazar, cancelar y expirar marcan `LIBERAR` dentro de la misma transacción que el
estado de sesión. Se intenta liberar inmediatamente; si falla queda persistido.
Un trabajo procesa hasta 50 operaciones por pasada, con espera progresiva de 1 a
60 minutos y sin abandonar silenciosamente las liberaciones. No requiere memoria
compartida entre instancias; el proveedor debe cumplir la idempotencia y conservar
el estado terminal de las operaciones. No borrar manualmente este diario.

El cron de expiración sigue siendo horario: no sobrescribe una aceptación que haya
ganado la carrera. Aceptar utiliza la reserva ya vigente, sin crear otra. Una
solicitud de 24 horas sigue PENDIENTE hasta que el cron la cambie a EXPIRADA.

## Verificación

```bash
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

`npm run test:sessions` ejecuta la integración de sesiones con PostgreSQL real y
un servidor HTTP simulado. Usa un esquema temporal `test_sessions_<uuid>`, aplica
las migraciones allí, verifica que las tablas públicas no cambiaron y lo elimina.
Usa `TEST_DATABASE_URL` o, en su defecto, `DATABASE_URL` / `DB_*`; necesita permisos
para crear esquemas. Las claves de las pruebas son aleatorias y exclusivas.

Estas pruebas validan el consumidor y el contrato propuesto; la prueba con el
microservicio real de Víctor queda pendiente hasta que exista su implementación.

## Límites conservados del trabajo previo

El POST de creación mantiene su contrato de identidad en el body; las rutas PATCH
sí verifican la identidad con JWT. La creación autenticada, el acceso exclusivo
mediante API Gateway, las notificaciones y la fase de cierre requieren sus tareas
correspondientes. El guard local verifica firma y vencimiento, pero no consulta la
revocación de tokens ni las suspensiones de usuarios-auth.
