# Contrato propuesto de bloques para Víctor

Estado: preparado en el consumidor `agendamiento-sesiones`; pendiente de acuerdo e
implementación en `feature/micro_materias_tutores`. No describe una API ya publicada.
La especificación importable está en [materias-tutores.openapi.yaml](materias-tutores.openapi.yaml).

## Propiedad y configuración

Víctor administra creación, edición, búsqueda, disponibilidad y reservas de
bloques en materias-tutores. Renato administra sesiones. No compartir tablas,
credenciales PostgreSQL ni relaciones Prisma entre los dos servicios.

Sesiones configura:

```dotenv
MATERIAS_TUTORES_URL=http://localhost:3001
MATERIAS_TUTORES_TOKEN=
MATERIAS_TUTORES_TIMEOUT_MS=4000
```

El puerto es un ejemplo; usar el del despliegue real. La URL es el origen sin ruta.
Acordar un token de servicio privado mediante un canal seguro y configurarlo en
ambos servicios. No es el JWT de un usuario ni `JWT_SECRET`. El proveedor debe
validar `Authorization: Bearer <token-de-servicio>` y proteger estas rutas internas;
usar HTTPS fuera del entorno local. No incluir valores reales en el repositorio.

Todos los IDs de negocio son BigInt positivo enviado como texto. El UUID de
reserva es una clave de operación generada por sesiones, no el ID del bloque.

## Una operación idempotente

```http
PUT /internal/v1/bloques/{id_bloque}/reservas/{id_reserva}
Authorization: Bearer <token-de-servicio>
Content-Type: application/json
```

Reservar:

```json
{"estado":"RESERVADA","id_tutor":"2","id_materia":"3"}
```

Respuesta **200**, tanto en la primera reserva como al repetir la misma operación:

```json
{
  "id_reserva":"11111111-1111-4111-8111-111111111111",
  "id_bloque":"4",
  "id_tutor":"2",
  "id_materia":"3",
  "estado":"RESERVADA",
  "inicio":"2026-10-01T13:00:00.000Z",
  "fin":"2026-10-01T14:00:00.000Z"
}
```

El proveedor comprueba de forma atómica que el bloque existe, pertenece al tutor,
está activo/disponible y el tutor puede impartir la materia. Devuelve 404 para
bloque o materia inexistente; 409 para indisponibilidad, tutor/materia incompatible,
reserva ya liberada o reutilización de un ID de reserva con otros parámetros.
El consumidor devuelve 503 ante red, timeout, 429 o errores 5xx; 502 ante una
respuesta incompatible o credenciales de servicio rechazadas.

`inicio` y `fin` son instantes UTC canónicos con milisegundos (formato del ejemplo),
con `fin > inicio`. El proveedor convierte su `dia`, `hora_inicio`, `hora_fin` y
zona horaria; no devuelve horas sin zona. Una reserva mantiene su horario y dueño
inmutables y no vence automáticamente mientras siga asociada a una sesión. La
cancelación, expiración o rechazo de sesión solicita explícitamente liberarla.

Liberar o compensar usa la misma ruta e ID de reserva:

```json
{"estado":"LIBERADA","id_tutor":"2","id_materia":"3"}
```

Respuesta **204 sin body**, aunque se repita o la reserva aún no haya llegado.
Debe liberar exclusivamente la reserva indicada; nunca la de otro consumidor u
operación. Si el bloque está inactivo, liberar no debe reactivarlo.

## Reglas imprescindibles para evitar reservas huérfanas

1. Un bloque solo admite una reserva vigente. Comprobar y reservar debe ser atómico.
2. Repetir una reserva con el mismo UUID y parámetros devuelve el mismo resultado
   y horario, sin crear otra reserva. Ese UUID queda vinculado a esos parámetros.
3. `LIBERADA` es terminal. Registrar también una liberación que llega antes de su
   reserva: una petición `RESERVADA` tardía con ese UUID deberá devolver 409.
   Así se compensa incluso un timeout cuya petición sigue procesándose.
4. Conservar ese registro terminal; no responder simplemente 404 y olvidarlo.
   No se acordó una política de purga: eliminarlo podría permitir una reserva tardía.
5. Una liberación de la operación A nunca libera la operación B, aunque use el
   mismo bloque. El bloque puede volver a reservarse con un UUID nuevo.
6. Todas estas decisiones deben funcionar con varias instancias del proveedor.
   No basta con comprobar disponibilidad y actualizarla después sin protección.

## Flujo desde sesiones

- Crear: persiste intención → reserva remota → valida límite/solapamiento → guarda
  sesión con horario recibido. Si no guarda, compensa mediante liberación.
- Aceptar: cambia PENDIENTE a CONFIRMADA; conserva la reserva existente.
- Rechazar/cancelar/expirar: cambia estado y registra liberación pendiente de forma
  atómica en su base. Llama al proveedor y reintenta en segundo plano si falla.
- Caída del proceso: recupera las intenciones huérfanas; las operaciones repetidas
  o fuera de orden son seguras por las reglas anteriores.

## Comprobación conjunta cuando esté listo

1. Crear un bloque real en materias-tutores con IDs reales de tutor y materia.
2. Configurar URL y token en ambos servicios. Crear una solicitud desde sesiones.
3. Verificar que el proveedor reserva el bloque y devuelve su horario UTC.
4. Aceptar como tutor; cancelar como participante; comprobar la liberación.
5. Repetir las pruebas con rechazo y expiración.
6. Interrumpir el proveedor al cancelar y restaurarlo: la liberación debe recuperarse.
7. Probar reserva duplicada, bloque ocupado, liberación repetida y liberación antes
   de reserva. Comprobar que ninguna operación afecta reservas ajenas.

El servidor de `test/support/materias-tutores.stub.ts` sirve únicamente como doble
de pruebas del consumidor. No debe copiarse a producción: no contiene persistencia,
control de concurrencia distribuida ni la implementación del servicio de Víctor.
