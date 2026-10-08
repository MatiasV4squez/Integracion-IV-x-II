# Pruebas de Materias/Tutores

Esta guía inventaría las pruebas existentes; no afirma que haya cobertura completa de todas las ramas del código ni del SRS. Los [ejemplos de API](api-y-demostracion.md) permiten una demostración manual y el [README](../README.md) explica configuración e integraciones pendientes.

## Comandos

Desde `materias-tutores`, con las dependencias instaladas y el cliente Prisma generado:

```powershell
npm.cmd run prisma:validate
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

Para verificar también los tipos de los archivos de prueba:

```powershell
npx.cmd tsc --noEmit --incremental false
```

No se necesita un servidor Nest escuchando ni los micros Auth/Agendamiento para esas suites. Las pruebas HTTP crean su propia aplicación y usan sustitutos de Prisma o de los servicios, según el archivo. `test/setup-env.ts` proporciona configuración ficticia para esa suite; no prueba las credenciales de tu `.env`.

Para ejecutar únicamente una suite:

```powershell
npm.cmd test -- src/materias/materias.service.spec.ts
npm.cmd test -- src/tutores/application/buscar-tutores-por-materia.use-case.spec.ts
npm.cmd run test:e2e -- test/tutores.e2e-spec.ts
```

`npm.cmd run test:cov` genera un informe de cobertura de la suite unitaria en `coverage/`. La cobertura indica qué código se ejecutó; no garantiza por sí sola que estén verificadas todas las reglas ni incorpora las suites HTTP/PostgreSQL ejecutadas por separado.

## Qué comprueba cada grupo

### Materias (RF05)

Consulta con selección de código/nombre y orden por código; respuesta HTTP del catálogo con Prisma simulado.

Archivos:

- `src/materias/materias.service.spec.ts`
- `test/materias.e2e-spec.ts`

### Disponibilidad (RF08)

Creación, formatos de día/hora, inicio anterior al fin, listado propio, horarios futuros en Santiago, edición/desactivación, propietario, JWT/rol y escrituras condicionadas al estado.

Archivos:

- `src/disponibilidad/disponibilidad.service.spec.ts`
- `test/disponibilidad.e2e-spec.ts`

### Postulaciones (RF06/RF07)

Validación de certificados/revisión, mínimo académico, rechazo, transición a rol pendiente, habilitación tras confirmar la llamada simulada y permisos/entrada HTTP. La suite HTTP sustituye `PostulacionesService`.

Archivos:

- `src/postulaciones/postulaciones.dto.spec.ts`
- `src/postulaciones/postulaciones.service.spec.ts`
- `test/postulaciones.e2e-spec.ts`

### Búsqueda (parte de RF09)

Coordinación de ports, paginación, validación, perfiles/horarios de la página, respuestas vacías, páginas consecutivas y precisión de IDs BIGINT. La suite HTTP integra controller/caso de uso/adaptadores con Prisma simulado.

Archivos:

- `src/tutores/application/buscar-tutores-por-materia.use-case.spec.ts`
- `src/tutores/infrastructure/prisma-tutores.repository.spec.ts`
- `src/tutores/infrastructure/disponibilidad-tutores.adapter.spec.ts`
- `src/tutores/infrastructure/http/dto/validar-paginacion.spec.ts`
- `test/tutores.e2e-spec.ts`

### Reputación (parte de RF25, BR07/BR08)

Notas 1–5, umbral y promedio exacto, revisión persistente, consultas, duplicados, conflictos, reintentos y permisos/validación HTTP.

Archivos:

- `src/reputacion/domain/reputacion.spec.ts`
- `src/reputacion/application/reputacion.use-cases.spec.ts`
- `src/reputacion/infrastructure/prisma-reputacion.repository.spec.ts`
- `test/reputacion.e2e-spec.ts`

### Reputación con PostgreSQL

Recorrido HTTP, guards, casos de uso y Prisma reales; concurrencia, duplicados, rollback, umbral, BIGINT y consultas sin notas en un esquema temporal.

Archivos:

- `test/reputacion.postgres-spec.ts`

### Contrato anterior de bloques

Escritura condicional de estado y protección por secreto interno. No prueba la coordinación con sesiones de Agendamiento.

Archivos:

- `src/integraciones/integraciones.service.spec.ts`
- caso de bloques en `test/reputacion.e2e-spec.ts`

### Configuración y conexión

Configuración inválida/válida y ciclo de conexión/desconexión simulado.

Archivos:

- `src/config/environment.spec.ts`
- `src/database/prisma.service.spec.ts`

### Ruta inicial

Respuesta `Hello World!`; no es una prueba de salud de PostgreSQL.

Archivos:

- `src/app.controller.spec.ts`
- `test/app.e2e-spec.ts`

Aunque el script se llama `test:e2e`, su base está sustituida. La prueba de reputación con PostgreSQL es una suite separada que sí abre una conexión real; ninguna de ellas inicia los demás microservicios.

## PostgreSQL real sin datos de prueba en public

```powershell
npm.cmd run test:reputacion:postgres
```

La configuración `vitest.config.postgres.ts` carga únicamente `test/reputacion.postgres-spec.ts`. Usa `TEST_DATABASE_URL` si está definida; en caso contrario toma `DATABASE_URL`, cargando `.env`. Solo admite un servidor local. La base debe existir y el usuario debe poder crear/eliminar esquemas.

La prueba crea `test_reputacion_<uuid>`, aplica allí las migraciones existentes y elimina ese esquema al finalizar normalmente. Comprueba que los registros de las tablas habituales de `public` conserven su contenido. Los secretos y JWT son exclusivos de la prueba; no requiere una cuenta real ni credenciales de otros servicios. Una terminación forzada del proceso puede impedir el cierre automático; no borres esquemas o tablas sin comprobar antes a qué ejecución pertenecen.

Esta suite cubre 10 casos, incluidos promedio exactamente `2.5`, notas bajas que activan revisión, aumento posterior del promedio, entregas simultáneas iguales y distintas, rollback provocado por fallo y conservación de identificadores grandes.

## Resultado de la última verificación

En la verificación previa al commit de reputación `2d2c6d3`, después de incorporar las pruebas de búsqueda del compañero:

- **Lint:** 0 errores y 0 advertencias.
- **Build y TypeScript sin emisión:** Correctos.
- **Unitarias (`npm test`):** 15 archivos, 121 casos aprobados.
- **HTTP (`test:e2e`):** 6 archivos, 79 casos aprobados.
- **PostgreSQL de reputación:** 1 archivo, 10 casos aprobados.

Este resultado corresponde a esa revisión y no reemplaza una nueva ejecución después de cambiar código. No se ha medido ni afirmado un porcentaje de cobertura total.

## Lo que todavía no demuestra esta batería

- Que un login real de Auth emita tokens compatibles y que los tokens revocados o usuarios suspendidos sean rechazados mediante una consulta al servicio de identidad.
- Que la búsqueda tenga nombre y autenticación: ambas funciones siguen pendientes y no deben presentarse como aprobadas.
- Que la aprobación asigne el rol mediante el endpoint real de Auth: las pruebas sustituyen la llamada.
- Que Agendamiento reserve/libere correctamente los bloques y entregue calificaciones de sesiones completadas. Las pruebas del receptor no prueban el emisor.
- Que el catálogo/semilla, certificados, postulaciones y disponibilidad pasen todas sus reglas contra PostgreSQL y el sistema de archivos reales: no tienen una suite automática integral equivalente a la de reputación. La comprobación manual anterior de paginación fue puntual.
- Que exista cobertura exhaustiva de seguridad, rendimiento o todos los criterios de aceptación del SRS.

La documentación de las funciones actuales puede completarse ahora. Si la tarea Scrum exige pruebas entre microservicios, esa parte debe quedar pendiente hasta integrar y comprobar los contratos reales.

## Problemas frecuentes

- **`Missing script`:** Ejecutar desde `materias-tutores`, no desde la raíz del repositorio.
- **No encuentra el cliente Prisma:** Ejecutar `npm.cmd run prisma:generate`.
- **No conecta a PostgreSQL en la suite real:** Verificar servicio, base y URL de conexión local, sin publicar credenciales.
- **HTTP devuelve `401`:** Revisar tipo de cabecera, vigencia/claims del JWT y coincidencia del secreto; un JWT no reemplaza el secreto interno.
- **Búsqueda devuelve `items: []`:** Revisar habilitaciones vigentes; la semilla solo crea materias.
- **Aprobación devuelve `503`:** Revisar el endpoint/configuración de Auth; comprobar si la postulación quedó `PENDIENTE_ROL`.
- **Oxlint falla al cargar un binding:** La versión fijada es `1.58.0`; reinstalar desde el lockfile no corrige por sí solo una política de Windows que bloquee el binario. Revisar el error específico antes de cambiar dependencias.
