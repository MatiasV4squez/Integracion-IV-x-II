# Contrato provisional con reportes/moderación

El emisor de este contrato está implementado en agendamiento-sesiones. Las
rutas y los campos siguientes deben acordarse con el equipo del receptor antes
de conectar ambos microservicios. No se ha implementado ni verificado aquí el
micro de reportes/moderación.

## Configuración y transporte

Configura `REPORTES_MODERACION_URL` con la base HTTP(S) del receptor, sin una
ruta final, y `MODERACION_INTEGRACION_SECRET` con el secreto que este valide.
El secreto debe tener al menos 32 bytes. Estas variables son independientes
de la integración con materias-tutores. `.env.example` contiene ejemplos;
el `.env` local no se modifica automáticamente.

El emisor realiza `POST` JSON con estos encabezados:

```text
Content-Type: application/json
X-Integracion-Secret: <MODERACION_INTEGRACION_SECRET>
Idempotency-Key: agendamiento-sesiones:moderacion:<id_aviso>
```

Cada petición tiene un límite de tres segundos y no sigue redirecciones.
Cualquier respuesta HTTP 2xx confirma la entrega, sin exigir un cuerpo de
respuesta. Errores de red, tiempo agotado y respuestas fuera de 2xx mantienen
el aviso pendiente, incluidos 401, 404 y 409. Un 404 no confirma un aviso:
puede significar que el receptor todavía no implementa la ruta.

## Conflicto detectado

Ruta propuesta en el receptor:

```text
POST /integraciones/sesiones/conflictos
```

Se genera cuando dos declaraciones difieren en el resultado o en el
participante inasistente y la sesión pasa a `EN_CONFLICTO`.

```json
{
  "origen": "agendamiento-sesiones",
  "version": 1,
  "id_aviso": "31",
  "fecha_aviso": "2026-10-13T12:00:00.000Z",
  "tipo": "CONFLICTO_DETECTADO",
  "id_sesion": "24",
  "id_tutor": "9007199254740993",
  "id_tutee": "9007199254740995",
  "id_materia": "7",
  "fecha_conflicto": "2026-10-13T12:00:00.000Z",
  "declaraciones": [
    {
      "id_declaracion": "50",
      "id_usuario": "9007199254740993",
      "resultado_declarado": "COMPLETADA",
      "id_usuario_inasistente": null,
      "fecha_declaracion": "2026-10-13T11:59:00.000Z"
    },
    {
      "id_declaracion": "51",
      "id_usuario": "9007199254740995",
      "resultado_declarado": "INASISTENCIA",
      "id_usuario_inasistente": "9007199254740993",
      "fecha_declaracion": "2026-10-13T12:00:00.000Z"
    }
  ]
}
```

El receptor debe registrar el caso por `id_sesion` y permitir que
administración consulte ambas declaraciones. La presentación del aviso en
su bandeja corresponde al receptor y a la página administrativa. Este aviso
no crea automáticamente un reporte de un usuario contra otro: un conflicto
de cierre y un reporte de conducta son operaciones distintas.

La primera declaración, los cierres coincidentes y los cierres provisionales
por falta de respuesta no generan este aviso.

## Conflicto resuelto

Ruta propuesta en el receptor:

```text
POST /integraciones/sesiones/resoluciones
```

Se genera al confirmar una resolución mediante el endpoint existente de
sesiones. Su contenido proviene de la auditoría guardada en PostgreSQL.

```json
{
  "origen": "agendamiento-sesiones",
  "version": 1,
  "id_aviso": "32",
  "fecha_aviso": "2026-10-13T12:30:00.000Z",
  "tipo": "CONFLICTO_RESUELTO",
  "id_sesion": "24",
  "id_resolucion": "8",
  "id_administrador": "12",
  "estado_final": "COMPLETADA",
  "motivo_resolucion": "Revisión de ambas declaraciones",
  "observaciones": null,
  "fecha_resolucion": "2026-10-13T12:30:00.000Z"
}
```

Los resultados permitidos son `COMPLETADA`, `NO_REALIZADA` e `INASISTENCIA`.
El receptor debe vincular la resolución con su caso y conservar la referencia
`id_resolucion` al registrar la actuación administrativa. Los IDs son texto y
las fechas son instantes UTC en formato ISO 8601.

Sesiones conserva la decisión original como fuente de verdad. El receptor
mantiene una proyección; este envío no altera cuentas, aplica sanciones ni
rectifica resoluciones. Esas operaciones necesitarían sus propios contratos.

## Decisión desde la página administrativa

La web, a través del API Gateway, utiliza la ruta ya implementada:

```text
PATCH /sessions/:id/resolve-conflict
Authorization: Bearer <JWT del administrador>
```

```json
{
  "nuevo_estado": "COMPLETADA",
  "motivo_resolucion": "Revisión de ambas declaraciones",
  "observaciones": "Acuerdo confirmado"
}
```

El administrador se obtiene del JWT con rol `ADMIN` o `ADMINISTRADOR`, nunca
del body. El secreto interno de los avisos no sustituye ese JWT ni autoriza
resolver sesiones. No se agrega otro endpoint para decisiones administrativas.

## Persistencia, reintentos y duplicados

La migración `20261013070000_avisos_moderacion_sesion` crea la tabla
`aviso_moderacion_sesion`. El cambio de estado, la declaración o resolución
y el aviso pendiente se guardan en la misma transacción. Si falla ese guardado,
la operación se revierte y no se envía HTTP.

Después de confirmar la transacción se intenta entregar el aviso. Si falta
configuración o falla el receptor, la decisión local permanece confirmada.
Una tarea cada minuto procesa hasta diez avisos pendientes. Se conservan
intentos, último error y fecha de entrega. El contenido es una instantánea:
un reintento conserva los mismos datos y la misma clave de idempotencia.

El receptor debe guardar el aviso antes de responder 2xx y deduplicar por
`(origen, id_aviso)` o por `Idempotency-Key`. Una repetición ya registrada debe
devolver 2xx sin duplicar el caso, la actuación ni el aviso al administrador.
Esto también cubre una entrega remota exitosa cuya confirmación local falle.
`id_resolucion` permite identificar adicionalmente la decisión original.

Una resolución espera a que se confirme el aviso de conflicto de su sesión,
si existe. Tras entregar ese conflicto, la resolución entra en el siguiente
lote; un fallo en una sesión no bloquea las demás. Los avisos confirmados
no se vuelven a consultar como pendientes.

La migración no crea avisos de conflictos ni resoluciones anteriores. Si se
resuelve un conflicto antiguo, su resolución sí genera un aviso nuevo; por
eso el receptor debe poder registrar una resolución por `id_sesion` aunque
no tenga un aviso previo de ese conflicto.

## Verificación del emisor

Las pruebas usan PostgreSQL en un esquema aislado y un receptor HTTP
simulado. Cubren el contrato, los IDs, el orden de los avisos, los permisos,
los reintentos, el rollback y una confirmación local fallida. La aceptación
del contrato y su implementación en reportes/moderación siguen pendientes.
