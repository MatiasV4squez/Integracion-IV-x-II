# API y demostración local

Esta guía describe el comportamiento implementado. La configuración y los pendientes están en el [README](../README.md); el alcance de las pruebas, en [Pruebas](pruebas.md).

## Preparación

Inicia PostgreSQL y sigue la instalación del README desde `materias-tutores`. Con `npm.cmd run start:dev` ejecutándose, las rutas están en `http://localhost:3000` si no cambiaste `PORT`. No hay un prefijo global como `/api` para las rutas del negocio: `/api` corresponde a Swagger.

Los ejemplos usan PowerShell. Las peticiones de lectura no crean registros. Crear horarios, postular, revisar o registrar una calificación sí modifica datos: para una demostración reproducible sin registros permanentes, utiliza las pruebas automatizadas indicadas en [Pruebas](pruebas.md).

## Identidad e identificadores

Las rutas protegidas reciben `Authorization: Bearer <access_token>`. El JWT debe usar HS256, emisor `stp-usuarios-auth`, audiencia `stp-clients` y contener `sub` como identificador positivo en texto, `exp` vigente, `jti` de 1 a 64 caracteres, `correo_institucional` de tipo texto y `roles` como lista de textos. El secreto debe coincidir con el configurado en este micro.

El tutor se obtiene de `sub`: el cuerpo de un bloque no acepta `idTutor`. Administradores requieren `ADMIN` o `ADMINISTRADOR`; la gestión de bloques requiere `TUTOR`. La consulta de disponibilidad y de reputación admite cualquier usuario con JWT válido.

Los identificadores PostgreSQL `BIGINT` van como texto en JSON para no perder precisión. Su rango permitido es de `1` a `9223372036854775807`. Los IDs de estos ejemplos son ilustrativos y deben reemplazarse por los de tu base.

## Catálogo y búsqueda

```powershell
$baseUrl = 'http://localhost:3000'
Invoke-RestMethod -Uri "$baseUrl/materias"
```

`GET /materias` responde `200` con `codigo` y `nombre`, ordenados por código. Si el catálogo está vacío, devuelve `[]`. Con la semilla actual:

```json
[
  { "codigo": "INFO1126", "nombre": "PROGRAMACIÓN III" },
  { "codigo": "INFO1157", "nombre": "SISTEMAS INTELIGENTES" },
  { "codigo": "MAT1188", "nombre": "CÁLCULO INTERMEDIO" }
]
```

Esta respuesta no incluye `idMateria`. Para una demostración de búsqueda, consulta el ID en tu base local, por ejemplo ejecutando en pgAdmin:

```sql
SELECT id_materia, codigo, nombre FROM materia ORDER BY codigo;
```

Luego consulta dos páginas, reemplazando `1` por ese ID:

```powershell
Invoke-RestMethod -Uri "$baseUrl/tutores?materiaId=1&page=1&limit=2" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "$baseUrl/tutores?materiaId=1&page=2&limit=2" | ConvertTo-Json -Depth 8
```

La respuesta tiene `items`, `total`, `page`, `limit` y `totalPages`. Cada item tiene `idTutor`, `promedioCalificaciones`, `cantidadCalificaciones` y `horariosDisponibles`. No se devuelve el nombre y esta ruta aún no exige JWT.

Si solo ejecutaste la semilla, no hay tutores habilitados: es correcto obtener:

```json
{ "items": [], "total": 0, "page": 1, "limit": 2, "totalPages": 0 }
```

La consulta exige `materiaId`; `page` y `limit` se omiten para usar `1` y `10`. Un `limit=101`, un ID inválido o parámetros repetidos devuelve `400`. Una materia sin habilitaciones, incluso si no existe, produce una página vacía; esta búsqueda no comprueba la existencia de la materia para devolver `404`.

## Bloques de disponibilidad

Define un token real vigente de tutor y una fecha futura en horario de Santiago:

```powershell
$tokenTutor = '<access_token de un tutor>'
$cabecerasTutor = @{ Authorization = "Bearer $tokenTutor" }
$dia = '<YYYY-MM-DD futuro>'
$cuerpo = @{ dia = $dia; horaInicio = '09:00'; horaFin = '10:00' } | ConvertTo-Json
$bloque = Invoke-RestMethod -Method Post -Uri "$baseUrl/disponibilidad/bloques" -Headers $cabecerasTutor -ContentType 'application/json' -Body $cuerpo
$bloque
```

El POST devuelve `201` y esta estructura, con los valores reales de la petición:

```json
{ "idBloque": "5", "dia": "2040-10-08", "horaInicio": "09:00", "horaFin": "10:00", "estadoBloque": "DISPONIBLE" }
```

Lista, edita y desactiva el bloque creado:

```powershell
Invoke-RestMethod -Uri "$baseUrl/disponibilidad/bloques" -Headers $cabecerasTutor
$idBloque = $bloque.idBloque
Invoke-RestMethod -Method Patch -Uri "$baseUrl/disponibilidad/bloques/$idBloque" -Headers $cabecerasTutor -ContentType 'application/json' -Body '{"horaFin":"10:30"}'
Invoke-RestMethod -Method Delete -Uri "$baseUrl/disponibilidad/bloques/$idBloque" -Headers $cabecerasTutor
```

PATCH y DELETE responden `200`. El DELETE conserva la fila con estado `INACTIVO`. El listado propio incluye los estados almacenados; la consulta pública autenticada excluye los bloques inactivos, reservados o cuyo inicio ya llegó:

```powershell
$tokenUsuario = '<access_token de un usuario>'
$cabecerasUsuario = @{ Authorization = "Bearer $tokenUsuario" }
$idTutor = '<ID del tutor>'
Invoke-RestMethod -Uri "$baseUrl/disponibilidad/tutores/$idTutor" -Headers $cabecerasUsuario
```

Esta consulta responde `200` con una lista o `[]`. Fechas u horas inválidas dan `400`; sin JWT válido, `401`; gestionar bloques sin rol tutor, `403`; editar un bloque ajeno o inexistente, `404`; editar o desactivar un bloque reservado/inactivo, `409`.

## Postulaciones

Para `POST /postulaciones`, en Postman selecciona Body → form-data:

**`idMateria`**

- Tipo: Text
- Valor: ID real de una materia, por ejemplo `1`.

**`certificado`**

- Tipo: File
- Valor: PDF o PNG válido, hasta `5 000 000` bytes.

Agrega el JWT del estudiante en Authorization → Bearer Token. Deja que Postman configure el `Content-Type` multipart con su boundary. El POST devuelve `201` y una postulación `PENDIENTE`; no concede el rol tutor.

La respuesta incluye `idPostulacion`, `idUsuario`, `idMateria`, `idAdministradorRevision`, `certificadoNombre`, `certificadoTipo`, `notaAcreditada`, `estado`, `fechaPostulacion`, `fechaRevision` y `motivoRechazo`. Los datos de revisión comienzan como `null`; no se expone la ruta privada del certificado.

El historial propio se consulta con `GET /postulaciones/mias`. Un administrador puede listar `GET /postulaciones/pendientes`, aprobar mediante `PATCH /postulaciones/:idPostulacion/aprobar` con `{"notaAcreditada":5.5}`, o rechazar mediante `PATCH /postulaciones/:idPostulacion/rechazar` con `{"motivoRechazo":"Certificado ilegible"}`.

Las revisiones responden `200`. La aprobación exige una nota mínima de `5.0`, máxima de `7.0`, con hasta un decimal. Una nota numérica válida inferior al mínimo devuelve `409`; un formato inválido devuelve `400`. Sin permiso administrativo se devuelve `403`; una revisión incompatible con el estado devuelve `409`.

Si Auth no confirma la asignación de rol, la aprobación responde `503` y conserva `PENDIENTE_ROL`, sin habilitar al tutor. `POST /postulaciones/:idPostulacion/reintentar-rol`, sin body y con JWT administrativo, reintenta la llamada; responde `200` al completarse. No se debe simular una aprobación exitosa cuando el endpoint de Auth todavía está pendiente.

El dueño o un administrador descarga el archivo mediante `GET /postulaciones/:idPostulacion/certificado`. La respuesta `200` es binaria PDF/PNG, no JSON. Postulación o certificado no disponible para ese usuario devuelve `404`. Un certificado inválido devuelve `400`; exceder el límite del interceptor multipart devuelve `413`.

## Integraciones y reputación

Las escrituras internas utilizan `X-Integracion-Secret`, no el JWT del cliente. El secreto configurado debe tener al menos 32 bytes; no se incluye ningún valor real en esta guía.

**`PATCH /integraciones/bloques/:idBloque/estado`**

- Body: `{"estado":"RESERVADO"}` o `{"estado":"DISPONIBLE"}`
- Respuesta: `200`: `idBloque` y `estadoBloque`.

**`POST /integraciones/tutores/:idTutor/calificaciones`**

- Body: `{"idCalificacion":"42","puntuacion":2,"rolEvaluado":"TUTOR"}`
- Respuesta: `201`: reputación actual, también al repetir el mismo evento.

**`GET /tutores/:idTutor/reputacion`**

- Body: Sin body; JWT Bearer
- Respuesta: `200`: reputación actual.

Un tutor habilitado sin calificaciones devuelve:

```json
{ "idTutor": "10", "cantidadCalificaciones": 0, "promedio": null, "estado": "ACTIVO" }
```

Tres calificaciones con suma `7` producen promedio `7 / 3` y `EN_REVISION`; exactamente `2.5` no activa la revisión. Una revisión ya activada se conserva. Reenviar el mismo ID/tutor/puntaje no incrementa la cantidad; reutilizar el ID con otra nota o tutor devuelve `409`.

No envíes calificaciones inventadas a la base habitual para probar el promedio: quedan registradas y no existe una ruta para eliminarlas. `npm.cmd run test:reputacion:postgres` demuestra el recorrido real HTTP/Prisma en un esquema temporal que se elimina al finalizar.

El PATCH de bloques es el contrato anterior: no implementa propiedad de reservas ni coordinación de sesiones. Agendamiento es responsable de decidir cuándo reservar y liberar; la integración real sigue pendiente. No están disponibles las rutas `/integraciones/reservas/...` del contrato retirado.

## Errores y comprobación inicial

Los errores usan las respuestas JSON de Nest, con `statusCode` y `message`; no todos los módulos incluyen los mismos campos adicionales. El código HTTP es el contrato para decidir cómo manejar el error.

- **`400`:** Parámetros, fechas, horas o cuerpo inválidos.
- **`401`:** JWT o secreto interno ausente/inválido.
- **`403`:** Rol insuficiente.
- **`404`:** Recurso inexistente o no accesible al usuario.
- **`409`:** Estado incompatible, evento contradictorio o conflicto de concurrencia.
- **`413`:** Archivo multipart mayor al límite.
- **`503`:** No se pudo completar la asignación remota de rol.

`GET /` devuelve `Hello World!`; comprueba que HTTP responde, pero no ejecuta una consulta a la base. `GET /materias` sí consulta PostgreSQL en la aplicación iniciada normalmente. Si no hay registros, `[]` es una respuesta válida, no un fallo de conexión.
