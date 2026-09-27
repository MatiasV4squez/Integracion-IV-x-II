# Aceptar, rechazar y cancelar sesiones

Implementa RF12 y RF15, con permisos BR14, transiciones BR02, solapamientos BR01
y ventana de cancelación BR15 del SRS.

## Configuración

- `JWT_SECRET`: mismo secreto de desarrollo que usa `usuarios-auth`, mínimo 32 bytes.
  Configurarlo en `.env`; nunca incluir el valor en código o documentación.
- El JWT debe usar HS256, emisor `stp-usuarios-auth`, audiencia `stp-clients`,
  `sub` como identificador numérico positivo en texto y `exp` vigente.
- `SESSION_TIME_ZONE`: zona IANA de los horarios; por defecto `America/Santiago`.
  Se interpreta `bloque_horario.dia` junto con `hora_inicio` en esa zona.
  PostgreSQL resuelve los cambios estacionales; no se usa el huso horario de Node.
  En horas ambiguas o inexistentes se aplica la resolución de PostgreSQL para esa zona.
- Aplicar las migraciones existentes y generar Prisma antes de iniciar el servicio.

El guard comprueba firma y vencimiento; los permisos se comprueban contra los
participantes guardados en la sesión. Un `id_usuario` enviado en el body no cambia
la identidad del token. La revocación de tokens y las suspensiones requieren el
contrato del servicio de usuarios; la verificación local no consulta ese estado.

## Rutas

Todas las operaciones usan `Authorization: Bearer <access_token>` y no necesitan body.
El parámetro `id` identifica una sesión y conserva formato UUID.

| Ruta                         | Usuario permitido                             | Transición             |
| ---------------------------- | --------------------------------------------- | ---------------------- |
| `PATCH /sessions/:id/accept` | Tutor asociado                                | PENDIENTE → CONFIRMADA |
| `PATCH /sessions/:id/reject` | Tutor asociado                                | PENDIENTE → RECHAZADA  |
| `PATCH /sessions/:id/cancel` | Tutor o estudiante asociado, antes del inicio | CONFIRMADA → CANCELADA |

Respuesta `200`: sesión actualizada, con `id_tutee` e `id_tutor` como texto para
conservar precisión de BIGINT. `fecha_actualizacion` se actualiza mediante Prisma.

| Código | Significado                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| 400    | UUID o entrada inválida                                                                                                    |
| 401    | Falta token, firma incorrecta, claims inválidos o token vencido                                                            |
| 403    | El usuario no es el participante autorizado                                                                                |
| 404    | No existe la sesión                                                                                                        |
| 409    | Estado incompatible, solapamiento, bloque inactivo/inconsistente, inicio alcanzado o conflicto de concurrencia persistente |

Al aceptar se excluye la propia sesión del control de solapamientos del tutor.
Las otras sesiones PENDIENTE, CONFIRMADA y PENDIENTE_CIERRE ocupan el horario;
los intervalos adyacentes se permiten. La creación también comprueba los
solapamientos del estudiante y el límite de cuatro solicitudes pendientes.

Crear una solicitud reserva el bloque. Rechazar, cancelar o expirar lo libera
solo si ninguna sesión activa lo ocupa. Un bloque INACTIVO no se reactiva.
El cron de expiración usa una actualización condicionada: no sobrescribe una
confirmación que haya ganado la carrera. Según BR03, una solicitud elegible por
antigüedad permanece PENDIENTE hasta que el cron la cambie a EXPIRADA.

La lectura, validación y actualización se ejecutan en una transacción Serializable.
Se realizan hasta tres intentos para conflictos P2034 o SQLSTATE 40001/40P01 del
adaptador. Repetir una operación sobre un estado ya finalizado devuelve 409 sin
duplicar efectos. No se implementan notificaciones ni la fase de cierre en esta tarea.

Los POST existentes de creación conservan su contrato; estas tres rutas PATCH son
las protegidas por el guard. La integración de creación autenticada y el acceso
exclusivo mediante API Gateway deben completarse con el equipo correspondiente.

## Pruebas

Usar Node.js 24.9 o superior:

```bash
npm run build
npm run lint
npm test -- --runInBand
npm run test:sessions
```

Las pruebas de sesiones usan Nest, el guard JWT y Prisma reales. Se ejecutan con
tokens firmados con una clave aleatoria exclusiva de pruebas, sin depender del login
de otro microservicio. La integración con un JWT emitido por el login desplegado
requiere una cuenta real y la configuración compartida entre ambos servicios.

La base se toma de `TEST_DATABASE_URL` si está definida; de lo contrario, de la
configuración local `DATABASE_URL` o `DB_*`. Debe tener aplicadas las migraciones
del proyecto y permitir crear esquemas. Cada ejecución crea un esquema temporal
`test_sessions_<uuid>`, aplica las migraciones allí y lo elimina al terminar.
No crea fixtures en `public` y comprueba que sus sesiones y bloques no cambiaron.

Se comprueban permisos, errores JWT, estados finales, solapamientos, BigInt,
zona horaria, límite de cancelación, liberación de bloques, rollback y carreras
entre aceptar/rechazar, cancelar/cancelar, aceptar/expirar y creaciones simultáneas.
