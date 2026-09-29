# Aceptar, rechazar y cancelar solicitudes

Alcance de Renato: estados, permisos y validaciones de las sesiones. No incluye
creación ni administración de bloques, clientes HTTP, contratos de otros
microservicios ni registro de reservas.

## Funcionamiento local

Las rutas requieren `Authorization: Bearer <access_token>` y no necesitan body.
JWT HS256, emisor `stp-usuarios-auth`, audiencia `stp-clients`, `sub` como entero
positivo en texto y `exp` vigente. Configurar `JWT_SECRET` en `.env`, mínimo 32 bytes.
Los permisos se comprueban contra los participantes guardados en la sesión.

| Ruta | Permiso | Transición |
| --- | --- | --- |
| `PATCH /sessions/:id/accept` | Tutor asociado | PENDIENTE → CONFIRMADA |
| `PATCH /sessions/:id/reject` | Tutor asociado | PENDIENTE → RECHAZADA |
| `PATCH /sessions/:id/cancel` | Tutor o estudiante, antes del inicio | CONFIRMADA → CANCELADA |

Los identificadores de sesión, usuario, materia y bloque son BIGINT positivos
(máximo 9223372036854775807), representados como texto en JSON y en las rutas.
La respuesta 200 contiene la sesión actualizada. `fecha_actualizacion` usa
`@updatedAt`. No se devuelve un estado de reserva ni se afirma liberar un bloque.

Al aceptar se comprueban solapamientos del tutor y estudiante contra las sesiones
PENDIENTE, CONFIRMADA y PENDIENTE_CIERRE, excluyendo la propia. Los intervalos
adyacentes se permiten. `inicio` y `fin` son instantes UTC guardados en la sesión;
la cancelación compara `inicio` con el reloj PostgreSQL, sin depender de la zona
del servidor Node.

Las transacciones son Serializable con hasta tres intentos ante conflictos P2034
o SQLSTATE 40001/40P01. Aceptar/rechazar y cancelar/cancelar simultáneamente solo
permiten una transición. Los estados incompatibles devuelven 409; entrada inválida
400, JWT inválido 401, falta de permiso 403 y sesión inexistente 404.

Se conserva el cron horario que cambia a EXPIRADA las solicitudes PENDIENTE de
24 horas. La actualización condicionada evita sobrescribir una aceptación.

## Cierre de sesiones

Una tarea programada cada minuto pasa de `CONFIRMADA` a `PENDIENTE_CIERRE`
cuando termina `fin`. Cada participante envía una declaración autenticada con
`POST /sessions/:id/closure-declarations` y un body como
`{"resultado_declarado":"COMPLETADA"}`. Los resultados válidos son `COMPLETADA`,
`NO_REALIZADA` e `INASISTENCIA`. En el último caso también se exige
`id_usuario_inasistente`, el identificador BigInt en texto de uno de los dos
participantes. Cada persona puede declarar una sola vez por sesión.

La primera declaración deja la sesión en `PENDIENTE_CIERRE`. Si ambas coinciden
en resultado y persona inasistente, se adopta ese resultado; si discrepan,
la sesión queda `EN_CONFLICTO`. Una tarea cada minuto adopta la primera
declaración si transcurren 48 horas sin respuesta, y marca
`resultado_provisional: true` en la sesión. La transición y el registro de
declaraciones usan transacciones serializables para evitar resultados dobles
ante peticiones concurrentes.

La resolución administrativa de `EN_CONFLICTO` y los avisos al administrador
requieren acordar permisos y eventos con los microservicios responsables.

## Pendiente de conexión entre microservicios

La creación necesita obtener un horario real y verificar la disponibilidad del
bloque. Como esa conexión queda fuera de este alcance, `POST /sessions` conserva
la validación de sus identificadores y devuelve 503 sin insertar registros. No
recibe horarios proporcionados por el cliente ni fabrica datos de bloques.

Aceptar/rechazar/cancelar funcionan sobre sesiones ya guardadas con sus horarios.
La reserva/liberación del bloque y la creación completa deberán conectarse cuando
el equipo implemente esa parte. Por eso el flujo completo con materias-tutores no
se considera terminado. El límite de cuatro pendientes deberá comprobarse al
restablecer la creación real de solicitudes.

La autenticación actual comprueba firma y vencimiento; la revocación y las
suspensiones requieren el servicio de usuarios. La creación autenticada, API
Gateway y notificaciones corresponden a sus tareas respectivas.

## Esquema y migraciones

El esquema contiene `sesion` y `declaracion_cierre`, sin relaciones Prisma hacia
otros microservicios. Se conservan los identificadores BigInt y los horarios de sesión.
La migración `20260927130000_retirar_integracion_bloques` retira el registro de
reservas añadido fuera de alcance. Si encuentra registros, se detiene sin borrar
nada. Las migraciones anteriores se conservan porque ya fueron aplicadas y publicadas.

```bash
npm run prisma:deploy
npm run prisma:generate
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Las pruebas usan Node.js 24.9 o superior y PostgreSQL real. Crean un esquema
`test_sessions_<uuid>`, aplican las migraciones, insertan sesiones y declaraciones
de prueba y lo eliminan al terminar. Comprueban que las tablas públicas no cambian.
No hay proveedor simulado ni llamadas a materias-tutores. La conexión se toma de
`TEST_DATABASE_URL` o de `DATABASE_URL` / `DB_*`.
