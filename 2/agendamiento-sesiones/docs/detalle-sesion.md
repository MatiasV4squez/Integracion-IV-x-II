# Detalle autenticado de una sesión

`GET /sessions/:id` requiere `Authorization: Bearer <JWT>`.
Desde el API Gateway: `GET /api/agendamiento-sesiones/sessions/:id`.

El identificador debe ser texto decimal positivo dentro del rango BIGINT.
La identidad y los roles se obtienen exclusivamente del JWT: los parámetros
de consulta no permiten seleccionar otro usuario ni conceder permisos.
Pueden consultar el detalle el estudiante, el tutor asociado y los roles
administrativos `ADMINISTRADOR` y `ADMIN`, compatibles con la resolución de
conflictos existente. Un administrador ajeno no obtiene acciones de participante.
Se conserva el guard JWT del micro; la comprobación centralizada de revocación
y suspensión corresponde a la integración de sesiones con Auth.

## Respuesta

La respuesta conserva los campos públicos de sesión (`id_sesion`, `id_tutee`,
`id_tutor`, `id_materia`, `id_bloque`, `estado_sesion`, `inicio`, `fin`,
`fecha_creacion`, `fecha_actualizacion`, `resultado_provisional`) y añade:

```json
{
  "datos_encuentro": {
    "modalidad": null,
    "lugar": null,
    "enlace": null
  },
  "declaraciones": [],
  "calificaciones": [],
  "acciones_disponibles": {
    "aceptar": true,
    "rechazar": true,
    "cancelar": false,
    "declarar_cierre": false,
    "calificar": false,
    "resolver_conflicto": false
  }
}
```

El ejemplo de acciones corresponde al tutor consultando una solicitud pendiente.
Los IDs se serializan como cadenas sin perder precisión; las fechas se envían
en ISO 8601. Se devuelve `Cache-Control: no-store`.

`datos_encuentro.modalidad` admite `PRESENCIAL`, `EN_LINEA` o `null`; `lugar`
y `enlace` son cadenas opcionales, con límites de 255 y 2048 caracteres.
La migración agrega columnas anulables y conserva las sesiones existentes,
cuyos datos del encuentro quedan sin definir. No se inventa modalidad ni enlace.
La escritura y validación de esos datos y su formulario pertenecen a la tarea
de definir/editar el encuentro; esta consulta ya entrega los valores persistidos.

Cada declaración incluye `id_declaracion`, `id_sesion`, `id_usuario`,
`resultado_declarado`, `id_usuario_inasistente` (texto o `null`) y
`fecha_declaracion`. Cada calificación incluye `id_calificacion`, `id_sesion`,
`id_evaluador`, `id_evaluado`, `puntuacion` y `fecha_calificacion`.
Ambos arreglos se ordenan por fecha e identificador ascendentes.

## Acciones disponibles

- `aceptar` y `rechazar`: tutor asociado y sesión `PENDIENTE`.
- `cancelar`: estudiante asociado y solicitud `PENDIENTE`, o cualquiera de
  los participantes en una sesión `CONFIRMADA` antes de su inicio.
- `declarar_cierre`: participante en estado `PENDIENTE_CIERRE` que todavía
  no registró su declaración.
- `calificar`: participante en estado `COMPLETADA` que todavía no calificó,
  siempre que tutor y estudiante sean usuarios diferentes.
- `resolver_conflicto`: administrador y estado `EN_CONFLICTO`.

Estas condiciones reflejan los comandos existentes, incluido el retiro de
solicitudes pendientes por el estudiante. Las acciones son información para
construir la interfaz: cada comando vuelve a comprobar sus permisos y estado,
porque los datos pueden cambiar después de la consulta.

## Errores y compatibilidad

- `400`: ID inválido o fuera de rango.
- `401`: JWT ausente, inválido o expirado.
- `403`: usuario ajeno sin permiso administrativo.
- `404`: sesión inexistente.

La consulta es de solo lectura y usa una instantánea `RepeatableRead` para
mantener coherentes sesión, declaraciones y calificaciones. No genera cambios
de estado, reservas, notificaciones ni llamadas a otros micros. Las rutas
`/sessions/history`, `/sessions/active` y los comandos conservan sus respuestas.
No se añaden consultas de nombres a usuarios-auth ni de materias a materias-tutores;
el contrato utiliza los identificadores externos existentes.

## Ejecución y comprobación

Desde `agendamiento-sesiones`, con la configuración local de PostgreSQL:

```sh
npm run prisma:deploy
npm run prisma:generate
npm run build
npm run lint
npm test -- --runInBand
npm run test:sessions
```

Las pruebas HTTP aplican las migraciones en un esquema PostgreSQL aislado,
comprueban JWT y permisos, datos persistidos y serialización, y verifican
que las tablas públicas no cambien. El caso de uso se prueba mediante su
puerto sin depender de Nest ni Prisma. Swagger documenta la respuesta y errores
en `/api/docs`.
