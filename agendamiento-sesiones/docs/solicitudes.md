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

No existe una ruta genérica `PATCH /sessions/:id/status`: aceptar, rechazar y
cancelar se hacen por las rutas anteriores, con el usuario obtenido del JWT y no
del cuerpo de la petición.

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

`PATCH /sessions/:id/resolve-conflict` exige un JWT con rol `ADMINISTRADOR` o
`ADMIN`. Solo permite pasar de `EN_CONFLICTO` a `COMPLETADA`, `NO_REALIZADA` o
`INASISTENCIA`, y requiere `motivo_resolucion`; `observaciones` es opcional.
El ID del administrador se obtiene del JWT, no del cuerpo. La transición y el
registro en `resolucion_conflicto_sesion` ocurren en la misma transacción. Ese
registro conserva el administrador, resultado, motivo, observaciones y fecha;
su ID de sesión es único y este micro no ofrece rutas para modificarlo o borrarlo.

Queda por acordar con el micro de reportes y moderación si su
`actuacion_administrativa` será la auditoría central o una proyección de este
registro, así como el contrato para comunicar la resolución y las eventuales
rectificaciones. Hasta entonces el historial de esta decisión queda en la base
de sesiones y no se afirma que moderación ya lo reciba. Los avisos al
administrador también requieren un contrato entre microservicios.

Propuesta para acordar con ese equipo: sesiones conserva la decisión original
como fuente de verdad y publica `id_resolucion`, `id_sesion`,
`id_administrador`, `estado_final`, `motivo_resolucion`, `observaciones` y
`fecha_resolucion`; moderación la registra usando `id_resolucion` como clave
de idempotencia. Antes de conectar ambos servicios hay que definir el transporte,
los reintentos y cómo enlazar una rectificación sin alterar la resolución original.

## Calificaciones de sesión

`POST /sessions/:id/ratings` requiere JWT y el body `{"puntuacion": 1}`,
con un entero entre 1 y 5. Solo el tutor y el estudiante de una sesión
`COMPLETADA` pueden calificar. El evaluador proviene del JWT y el evaluado se
deduce de la sesión; el cliente no puede indicar ninguno de esos IDs. Cada
participante puede registrar una sola calificación por sesión. No existen
rutas para editar o borrar una calificación. La tabla `calificacion` guarda
ambos IDs, el puntaje y la fecha; la migración añade unicidad y restricción
de rango en PostgreSQL.

La respuesta incluye la calificación y la reputación actual del tutor. El
historial de sesiones incluye las calificaciones asociadas. También se puede
consultar `GET /sessions/tutors/:id/reputation`: el promedio se calcula al
leer las notas recibidas **como tutor**, sin incluir las recibidas como
estudiante. `requiere_revision` indica si ya hay al menos tres notas y el
promedio es inferior a 2,5.

Cuando un tutor recibe una nota, este micro guarda un envío pendiente en la
misma transacción que la calificación y luego llama a
`POST /integraciones/tutores/:idTutor/calificaciones` de `materias-tutores`.
Envía `idCalificacion` como texto, `puntuacion` y `rolEvaluado: "TUTOR"` con el
encabezado `X-Integracion-Secret`. No envía las notas recibidas como estudiante.
El receptor usa `idCalificacion` para evitar duplicados y actualiza su perfil,
incluido `EN_REVISION` tras tres notas con promedio inferior a 2,5.

Configura `MATERIAS_TUTORES_URL` con la base HTTP(S) de ese micro e
`INTEGRACION_SECRET` con el mismo secreto de al menos 32 bytes que usa el
receptor. Si falta configuración o el receptor falla, la calificación local
continúa guardada y el envío queda pendiente en `entrega_reputacion_tutor`.
Una tarea programada cada minuto reintenta hasta diez envíos pendientes; la
migración también incluye notas anteriores recibidas como tutor. Las pruebas
verifican el contrato HTTP con un receptor simulado, pero el despliegue real
entre ambos micros aún requiere configurar las dos variables y comprobar que
el tutor esté habilitado en `materias-tutores`.

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

El esquema contiene `sesion`, `declaracion_cierre`,
`resolucion_conflicto_sesion`, `calificacion` y `entrega_reputacion_tutor`, sin relaciones Prisma hacia
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
