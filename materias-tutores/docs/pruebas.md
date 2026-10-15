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
npm.cmd test -- src/materias/aplicacion/listar-materias.use-case.spec.ts
npm.cmd test -- src/tutores/aplicacion/buscar-tutores-por-materia.use-case.spec.ts
npm.cmd run test:e2e -- test/tutores.e2e-spec.ts
```

`npm.cmd run test:cov` genera un informe de cobertura de la suite unitaria en `coverage/`. La cobertura indica qué código se ejecutó; no garantiza por sí sola que estén verificadas todas las reglas ni incorpora las suites HTTP/PostgreSQL ejecutadas por separado.

## Qué comprueba cada grupo

### Materias (RF05)

Caso de uso independiente de Nest/Prisma, consulta con selección de código/nombre y orden por código, catálogo vacío, exclusión de campos internos y errores HTTP. La suite PostgreSQL prueba el recorrido real del módulo con datos aislados.

Archivos:

- `src/materias/aplicacion/listar-materias.use-case.spec.ts`
- `src/materias/infraestructura/prisma-materias.repository.spec.ts`
- `test/materias.e2e-spec.ts`
- `test/materias.postgres-spec.ts`

### Disponibilidad (RF08)

Creación, formatos de día/hora, inicio anterior al fin, listado propio, horarios futuros en Santiago, edición/desactivación, propietario, JWT/rol y escrituras condicionadas al estado.

Archivos:

- `src/disponibilidad/dominio/bloque-horario.spec.ts`
- `src/disponibilidad/aplicacion/disponibilidad.use-cases.spec.ts`
- `src/disponibilidad/infraestructura/prisma-disponibilidad.repository.spec.ts`
- `test/disponibilidad.postgres-spec.ts`
- `test/disponibilidad.e2e-spec.ts`

### Postulaciones (RF06/RF07)

Validación de certificados/revisión, mínimo académico, rechazo, transición a rol pendiente, habilitación tras confirmar la llamada simulada y permisos/entrada HTTP. La suite HTTP sustituye `PostulacionesService`.

Archivos:

- `src/postulaciones/postulaciones.dto.spec.ts`
- `src/postulaciones/postulaciones.service.spec.ts`
- `test/postulaciones.e2e-spec.ts`

### Búsqueda (parte de RF09)

Coordinación de puertos, paginación, validación, perfiles/horarios de la página, respuestas vacías, páginas consecutivas y precisión de IDs BIGINT. La suite HTTP integra controller/caso de uso/adaptadores con Prisma simulado.

Archivos:

- `src/tutores/aplicacion/buscar-tutores-por-materia.use-case.spec.ts`
- `src/tutores/infraestructura/prisma-tutores.repository.spec.ts`
- `src/tutores/infraestructura/disponibilidad-tutores.adapter.spec.ts`
- `src/tutores/infraestructura/http/dto/validar-paginacion.spec.ts`
- `test/tutores.e2e-spec.ts`

### Reputación (parte de RF25, BR07/BR08)

Notas 1–5, umbral y promedio exacto, revisión persistente, consultas, duplicados, conflictos, reintentos y permisos/validación HTTP.

Archivos:

- `src/reputacion/dominio/reputacion.spec.ts`
- `src/reputacion/aplicacion/reputacion.use-cases.spec.ts`
- `src/reputacion/infraestructura/prisma-reputacion.repository.spec.ts`
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

Para el catálogo real, ejecuta `npm.cmd run test:materias:postgres`. Su configuración es `vitest.config.materias-postgres.ts`; utiliza las mismas variables de conexión local y un esquema propio `test_materias_<uuid>`. Aplica las migraciones allí, comprueba catálogo vacío, orden real, caracteres Unicode, exclusión del ID BIGINT y lectura de cambios persistidos. Elimina su esquema y comprueba que `public.materia` conserve su contenido. No ejecuta la semilla sobre tus datos habituales.

## Verificación de la adaptación hexagonal de Materias

Revisión local del 14 de octubre de 2026:

- Prisma validate, build y TypeScript sin emisión: correctos.
- Lint: 0 errores y 0 advertencias.
- Unitarias: 16 archivos, 125 casos aprobados.
- HTTP: 6 archivos, 82 casos aprobados.
- PostgreSQL de Materias: 4 casos aprobados.
- PostgreSQL de Reputación: 10 casos aprobados.

La prueba real del catálogo verifica que `public.materia` no cambió y que el esquema temporal fue eliminado. La suite HTTP de Disponibilidad necesitaba actualizar un mock de su consulta de solapamientos; su fallo se observó antes de cambiar Materias. No se modificó su lógica productiva.

## Disponibilidad con PostgreSQL real

Tras la adaptación hexagonal, el 14 de octubre de 2026, pasaron 161 casos unitarios en 18 archivos y 82 casos HTTP en 6 archivos. Las suites PostgreSQL pasaron 12 casos de Disponibilidad, 4 de Materias y 10 de Reputación. Prisma validate, build, TypeScript y lint también pasaron; lint no reportó errores ni advertencias. Las pruebas comprobaron la limpieza de sus esquemas y la conservación de los datos públicos correspondientes.

Ejecuta `npm.cmd run test:disponibilidad:postgres`. Usa un esquema aislado `test_disponibilidad_<uuid>` y la conexión local de `TEST_DATABASE_URL` o `DATABASE_URL`. Sus 12 casos recorren HTTP/guards/casos de uso/Prisma y comprueban CRUD, formatos, propietario, estado, horarios futuros, BIGINT, solapamientos secuenciales y escritura condicionada. El reloj se sustituye por un instante fijo; no requiere login real. Al terminar elimina el esquema y compara los datos de `public.bloque_horario`.

## Resultado histórico anterior a la adaptación de Materias

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
- Que la semilla, certificados y postulaciones pasen todas sus reglas contra PostgreSQL y el sistema de archivos reales: las suites de Materias y Disponibilidad no verifican esas operaciones. La comprobación manual anterior de paginación fue puntual.
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
