# Revisión de concurrencia de bloques

Revisión del 1 de noviembre de 2026, correspondiente a la tarea de Sergio Hermosilla. Se comprobó la validación existente en Materias/Tutores y su integración con Sesiones, sin ampliar las reglas de negocio.

## Cómo se revisó

Primero se siguió el flujo desde los casos de uso de creación, edición y desactivación hasta las escrituras en PostgreSQL. Se comprobó dónde se validan el horario, el propietario y el estado, y si esas condiciones siguen protegiendo la escritura después de una lectura desactualizada.

| Código revisado | Comprobación realizada |
|---|---|
| [Reglas del bloque](../src/disponibilidad/dominio/bloque-horario.ts) | Comparación de intervalos, adyacencia y exigencia de estado disponible. |
| [Repositorio de disponibilidad](../src/disponibilidad/infraestructura/prisma-disponibilidad.repository.ts) | Bloqueo transaccional por tutor, nueva consulta de solapamientos antes de escribir y actualización condicionada al propietario/estado. |
| [Servicio de integraciones](../src/integraciones/integraciones.service.ts) | Reserva y liberación condicionadas al estado anterior; reconocimiento de repeticiones del mismo estado. |
| `GestionarSesiones` y `UnidadDeTrabajoPrisma`, en Sesiones | Revalidación antes de guardar, transacción serializable y comprobación de sesión activa antes de compensar una reserva. |

Después se ejecutaron las pruebas existentes: unitarias para las reglas y contratos, HTTP/PostgreSQL para la persistencia real y el flujo integrado para peticiones simultáneas. Se revisaron las aserciones que comparan respuestas y consultan los registros guardados. Las unitarias usan sustitutos de dependencias; la demostración de concurrencia real corresponde al flujo integrado.

## Resultados

| Comprobación | Resultado |
|---|---|
| Unitarias de disponibilidad e integración interna | 56 aprobadas |
| Disponibilidad con HTTP y PostgreSQL reales | 12 aprobadas |
| Flujo integrado con Gateway, Materias y Sesiones | 11 aprobadas |

**Total: 79 pruebas aprobadas.** También compilaron correctamente los tres proyectos. Los comandos de reproducción permiten ver en la terminal el nombre de cada prueba y su resultado.

Estos son los casos principales y las aserciones que aprobaron:

| Escenario | Resultado esperado y observado |
|---|---|
| 12 altas idénticas simultáneas | Una respuesta `201`, once `409` y una sola fila de bloque. |
| Dos ediciones hacia el mismo intervalo libre | Una respuesta `200`, otra `409` y una sola ocupación del intervalo. |
| Leer disponible, reservar y después intentar editar/desactivar | Ambas escrituras rechazan con `CONFLICTO`; el bloque sigue `RESERVADO`. |
| Seis solicitudes simultáneas al mismo bloque | Una respuesta `201`, cinco `409`, una sola sesión y su bloque `RESERVADO`. |

Las pruebas simultáneas usan peticiones en paralelo y barreras que retrasan lecturas o respuestas reales para provocar la competencia. El caso de lectura anterior a la reserva controla ese orden de operaciones. También aprobaron desactivaciones, reserva/liberación y aceptación/rechazo repetidos. Un `409` en una petición perdedora es el resultado esperado.

## Cómo reproducir

Con PostgreSQL local activo y las dependencias instaladas, desde la raíz local `Integracion`:

```powershell
npm.cmd --prefix .\agendamiento-sesiones\agendamiento-sesiones run build
npm.cmd --prefix .\api-gateway\api-gateway run build
Set-Location .\materias-tutores\materias-tutores
npm.cmd test -- src/disponibilidad src/integraciones/integraciones.service.spec.ts --reporter=verbose
npm.cmd run test:disponibilidad:postgres -- --reporter=verbose
$env:SESIONES_PROJECT_DIR = (Resolve-Path '..\..\agendamiento-sesiones\agendamiento-sesiones').Path
$env:GATEWAY_PROJECT_DIR = (Resolve-Path '..\..\api-gateway\api-gateway').Path
npm.cmd run test:flujo-tutor
```

Ejecutar las suites de base de datos por separado. Requieren una conexión local válida en la configuración de pruebas y permisos para crear/eliminar esquemas temporales. La suite integrada compila Materias e inicia sus propios servidores en puertos aleatorios; no necesita la web ni Auth.

## Conclusión y alcance

No se necesitaron ajustes adicionales: las protecciones ya estaban implementadas. El aporte de esta tarea es revisar su funcionamiento y dejar evidencia de su verificación.

Las suites comprobaron la conservación de los datos habituales y eliminaron sus esquemas temporales al terminar. No se modificaron código, pruebas ni migraciones. La conclusión se limita al código local y los escenarios comprobados; no acredita todos los posibles fallos de red ni el recorrido completo desde la web. Se usaron JWT de prueba y tutores preparados, sin ejecutar el login real.

Referencias: [disponibilidad con PostgreSQL](../test/disponibilidad.postgres-spec.ts), [flujo integrado](../test/flujo-tutor.integration.mjs) y [detalle de las protecciones y pruebas](rendimiento-idempotencia-tutor.md).
