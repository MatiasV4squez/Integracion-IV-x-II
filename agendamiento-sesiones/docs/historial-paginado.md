# Historial paginado por participación y estado

```http
GET /sessions/history/paginated?page=1&limit=20&rol=TUTOR&estado=COMPLETADA
Authorization: Bearer <JWT>
```

Desde el Gateway, la ruta es
`/api/agendamiento-sesiones/sessions/history/paginated`.

## Contrato

- `page`: entero positivo, por defecto 1; máximo 1000000.
- `limit`: entero positivo, por defecto 20; máximo 100.
- `rol`: opcional, `ESTUDIANTE` o `TUTOR`.
- `estado`: opcional, uno de `PENDIENTE`, `CONFIRMADA`, `RECHAZADA`,
  `EXPIRADA`, `CANCELADA`, `PENDIENTE_CIERRE`, `COMPLETADA`, `NO_REALIZADA`,
  `INASISTENCIA` o `EN_CONFLICTO`.

Los enteros se envían en decimal sin signos, espacios, decimales ni ceros
iniciales. Los filtros distinguen mayúsculas y minúsculas. Se rechazan valores
vacíos, parámetros repetidos y parámetros desconocidos con `400`.

La identidad se obtiene exclusivamente de `sub` del JWT. `rol` describe la
participación del usuario en cada sesión, no concede permisos ni selecciona
otra cuenta: `ESTUDIANTE` filtra por `id_tutee` y `TUTOR` por `id_tutor`.
Sin `rol`, se incluyen ambas participaciones sin duplicar sesiones. Un
administrador también consulta únicamente su historial propio en esta ruta.
Sin `estado`, se incluyen todos los estados, igual que en el historial original.

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

Cada elemento de `items` tiene los mismos campos públicos del historial
anterior, incluidas sus calificaciones: identificadores como texto decimal,
fechas ISO 8601 y `resultado_provisional` booleano. No se exponen campos
internos adicionales ni datos del encuentro. Las calificaciones se ordenan
por fecha e identificador ascendentes.

`total` cuenta únicamente las sesiones que coinciden con todos los filtros,
antes de paginar. `totalPages` es el redondeo superior de `total / limit`.
Una página fuera del resultado devuelve `200` con `items: []`, conservando
el total y la página solicitada. Si no hay coincidencias, `totalPages` es 0.
La respuesta incluye `Cache-Control: no-store`.

## Persistencia y compatibilidad

Los filtros, `skip` y `take` se aplican en PostgreSQL mediante Prisma, sin cargar
el historial completo en memoria. El orden es `fecha_creacion DESC, id_sesion DESC`
para desempatar sesiones creadas a la misma hora. El conteo y la lectura de
los elementos comparten una transacción `RepeatableRead`, de modo que sus
totales y registros pertenecen a la misma instantánea. Entre peticiones distintas,
las nuevas sesiones o cambios de estado pueden desplazar las páginas.

`GET /sessions/history` sigue devolviendo el arreglo completo que usan las
pantallas actuales. No se cambia su ruta, formato ni comportamiento.
`/sessions/active`, `/sessions/:id` y los comandos existentes conservan sus contratos.
La futura pantalla Mis tutorías puede consumir la nueva ruta sin modificar las
consultas existentes de paneles y solicitudes recibidas.

No se requiere una migración nueva para esta funcionalidad. Deben aplicarse
las migraciones existentes de la rama y generarse el cliente antes de compilar.

Un JWT ausente, malformado, expirado, con firma incorrecta, emisor o audiencia
incorrectos devuelve `401`. Se reutiliza el guard JWT del micro. Las pruebas HTTP
usan un esquema PostgreSQL aislado y comprueban que no se modifiquen las tablas
públicas. Swagger muestra los parámetros, la respuesta y los errores en `/api/docs`.

```sh
npm run build
npm run lint
npm test -- --runInBand
npm run test:sessions
```
