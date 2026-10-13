# Aceptar, rechazar y cancelar solicitudes

El micro implementa creación, estados, permisos y validaciones de las sesiones.
La administración de bloques pertenece a materias-tutores y se consulta mediante
su API; este micro no accede a sus tablas ni guarda un modelo local de bloques.

## Creación de solicitudes

`POST /sessions` requiere `Authorization: Bearer <access_token>`. El cuerpo
contiene exclusivamente identificadores BIGINT positivos como texto:

```json
{
  "id_tutor": "10",
  "id_materia": "3",
  "id_bloque": "25"
}
```

El estudiante se obtiene del JWT. `id_tutee`, `fechaInicio`, `fechaFin` y `notas`
no se aceptan en el cuerpo: el horario se obtiene del bloque y no existe un campo
local de notas en el MER ni en Prisma. Tutor y estudiante deben ser distintos.

La creación consulta `GET /tutores?materiaId=...&page=...&limit=100` de
materias-tutores. Recorre las páginas hasta localizar el tutor habilitado para la
materia y su bloque disponible; admite también la respuesta anterior en forma
de arreglo. Convierte `dia`, `horaInicio` y `horaFin` de `America/Santiago` a UTC.
Las horas inexistentes o ambiguas se rechazan como una respuesta de integración
inválida, en lugar de escoger arbitrariamente un instante.

Antes de reservar comprueba el máximo de cuatro solicitudes PENDIENTE del
estudiante, el inicio futuro y los compromisos activos del bloque o de cualquiera
de los participantes. Luego solicita
`PATCH /integraciones/bloques/:idBloque/estado` con `{"estado":"RESERVADO"}` y
`X-Integracion-Secret`. Las mismas comprobaciones locales se repiten en la
transacción que guarda la sesión como PENDIENTE con su horario canónico.

No hay llamadas HTTP dentro de transacciones PostgreSQL. Si la reserva fue
confirmada pero falla el guardado, se intenta compensar mediante el mismo PATCH
con `{"estado":"DISPONIBLE"}`. Si falla esa liberación, el endpoint informa 503
y se registra el bloque que necesita revisión. Cuando reservar falla o pierde
su respuesta, no se afirma que la reserva haya sido confirmada ni se libera un
bloque de propiedad desconocida.

Configurar `MATERIAS_TUTORES_URL` e `INTEGRACION_SECRET` en ambos servicios.
La búsqueda completa tiene un límite de espera de cinco segundos, compartido
entre sus páginas; cada cambio de estado también tiene un límite de cinco segundos.
El escenario de solicitudes simultáneas para el mismo bloque está fuera del
alcance acordado. El contrato de estado actual no identifica al propietario.

| HTTP | Resultado                                                                         |
| ---- | --------------------------------------------------------------------------------- |
| 201  | Sesión creada en PENDIENTE; IDs como texto y horario UTC                          |
| 400  | Entrada inválida, campos adicionales o tutor igual al estudiante                  |
| 401  | Token ausente, inválido o vencido                                                 |
| 404  | El bloque desapareció al intentar reservar                                        |
| 409  | Cuatro pendientes, horario comprometido/vencido o tutor/bloque no disponible      |
| 503  | Integración no configurada, timeout, respuesta inválida o proveedor no disponible |
| 500  | Fallo inesperado de persistencia; se intenta compensar la reserva                 |

Swagger está disponible en `/api/docs`. La operación `POST /sessions` muestra
los tres identificadores requeridos, la autenticación Bearer, la respuesta 201
con IDs como texto y fechas UTC, y los códigos de error anteriores. La prueba
de documentación verifica el documento OpenAPI generado por NestJS.

## Funcionamiento local

Las rutas requieren `Authorization: Bearer <access_token>` y no necesitan body.
JWT HS256, emisor `stp-usuarios-auth`, audiencia `stp-clients`, `sub` como entero
positivo en texto y `exp` vigente. Configurar `JWT_SECRET` en `.env`, mínimo 32 bytes.
Los permisos se comprueban contra los participantes guardados en la sesión.

| Ruta                         | Permiso                              | Transición             |
| ---------------------------- | ------------------------------------ | ---------------------- |
| `PATCH /sessions/:id/accept` | Tutor asociado                       | PENDIENTE → CONFIRMADA |
| `PATCH /sessions/:id/reject` | Tutor asociado                       | PENDIENTE → RECHAZADA  |
| `PATCH /sessions/:id/cancel` | Tutor o estudiante, antes del inicio | CONFIRMADA → CANCELADA |

No existe una ruta genérica `PATCH /sessions/:id/status`: aceptar, rechazar y
cancelar se hacen por las rutas anteriores, con el usuario obtenido del JWT y no
del cuerpo de la petición.

Los identificadores de sesión, usuario, materia y bloque son BIGINT positivos
(máximo 9223372036854775807), representados como texto en JSON y en las rutas.
La respuesta 200 contiene la sesión actualizada. `fecha_actualizacion` usa
`@updatedAt`. La respuesta representa el estado local de la sesión; la liberación
del bloque se procesa después de confirmar la transacción.

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

## Liberación de bloques

Al rechazar, cancelar o expirar una sesión se registra una liberación pendiente
en `liberacion_bloque_sesion`. El cierre también registra esa liberación al
adoptar `COMPLETADA`, `NO_REALIZADA`, `INASISTENCIA` o `EN_CONFLICTO`, tanto por
declaraciones coincidentes como por adopción provisional tras 48 horas.
La resolución administrativa utiliza el mismo registro de la sesión.

El cambio de estado y la liberación pendiente se guardan en una sola transacción.
Después de confirmar esa transacción se solicita a materias-tutores
`PATCH /integraciones/bloques/:idBloque/estado` con `{"estado":"DISPONIBLE"}` y
el secreto interno. La sesión conserva su cambio de estado si el proveedor falla;
el registro queda pendiente para que una tarea cada minuto reintente hasta diez
liberaciones. Se guardan intentos, último error y fecha de confirmación.

La reserva se mantiene mientras la sesión siga en `PENDIENTE`, `CONFIRMADA` o
`PENDIENTE_CIERRE`; la primera declaración no la libera. Antes de enviar una
liberación se comprueba que ninguna sesión local activa comprometa ese bloque.
Una liberación confirmada no se reenvía ni se reactiva al resolver el conflicto.
Si materias-tutores indica que el bloque ya no existe, el pendiente se completa.

La migración nueva crea la tabla sin modificar migraciones anteriores ni
registrar liberaciones automáticas para sesiones históricas. Para otros entornos,
aplicar `npm run prisma:deploy` antes de iniciar la versión actualizada.

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

El emisor de avisos a reportes/moderación está implementado con un contrato
HTTP provisional descrito en [moderacion.md](moderacion.md). Al pasar a
`EN_CONFLICTO`, registra un aviso con ambas declaraciones; al resolver, otro
con la decisión original y `id_resolucion`. Sesiones conserva la fuente de
verdad y propone que moderación mantenga una proyección de la actuación.

Cada aviso se guarda en `aviso_moderacion_sesion` dentro de la transacción
local y se envía después de confirmarla. Si falla el receptor o falta
configuración, el aviso queda pendiente y se reintenta cada minuto. Los envíos
usan IDs de texto y una clave estable para que el receptor evite duplicados.
La resolución espera al aviso de conflicto de su sesión cuando este existe.
La migración no genera avisos históricos.

Configura `REPORTES_MODERACION_URL` y `MODERACION_INTEGRACION_SECRET` cuando
el equipo del receptor acepte el contrato e implemente sus rutas. La bandeja
de avisos al administrador, la proyección en `actuacion_administrativa` y
las posibles rectificaciones requieren trabajo del receptor y de la web.

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
estudiante. Sin notas recibidas como tutor, devuelve
`cantidad_calificaciones: 0`, `promedio: null` y `requiere_revision: false`;
esto también aplica a la reputación incluida en la respuesta al calificar.
`requiere_revision` indica si ya hay al menos tres notas y el promedio es
inferior a 2,5.

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
verifican el contrato HTTP con un receptor simulado. La ejecución de desarrollo
requiere esas variables y datos válidos.

## Pendientes de integración entre microservicios

La creación y su compensación utilizan el contrato HTTP de materias-tutores.
La suite e2e utiliza un receptor HTTP local de prueba y PostgreSQL en un esquema
aislado para ejecutar sus comprobaciones sin depender del otro servicio.

La creación, su compensación y la liberación durante el ciclo de vida utilizan
el contrato de cambio de estado de materias-tutores. La configuración de la
integración debe estar presente para completar las liberaciones; mientras tanto,
las solicitudes de liberación permanecen guardadas para sus reintentos.

La revocación de JWT y las suspensiones requieren coordinación con usuarios.
La exposición a la web mediante API Gateway pertenece a su tarea respectiva.
El envío de conflictos y resoluciones está implementado; la aceptación del
contrato y las rutas receptoras de reportes/moderación siguen pendientes.

## Esquema y migraciones

El esquema contiene `sesion`, `declaracion_cierre`,
`resolucion_conflicto_sesion`, `calificacion`, `entrega_reputacion_tutor` y
`liberacion_bloque_sesion` y `aviso_moderacion_sesion`, sin relaciones Prisma hacia
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
Las consultas y cambios de bloques se prueban con HTTP hacia un receptor local;
los envíos de reputación tienen respuestas HTTP simuladas. La conexión a
PostgreSQL se toma de
`TEST_DATABASE_URL` o de `DATABASE_URL` / `DB_*`.
