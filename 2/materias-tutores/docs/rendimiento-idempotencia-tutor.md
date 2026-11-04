# Rendimiento e idempotencia del flujo Tutor

Validación local del 29 de octubre de 2026. Alcance: disponibilidad del tutor ya
habilitado, búsqueda, creación de solicitudes, consulta, aceptación, rechazo y
liberación. No incluye registro, asignación inicial del rol TUTOR ni notificaciones.

## Recorrido comprobado

`test/flujo-tutor.integration.mjs` inicia el Gateway y las aplicaciones reales de
Materias/Tutores y Sesiones en puertos aleatorios. Usa sus controllers, guards,
casos de uso, repositorios Prisma y PostgreSQL reales. El emisor de JWT de prueba
reemplaza únicamente el login. Los tutores se preparan como datos iniciales.
No se necesita iniciar la web, Auth, cron ni Observe.

Entre Sesiones y Materias se intercala un proxy HTTP de prueba. Reenvía las
respuestas reales y permite retrasarlas en dos barreras para reproducir solicitudes
que ya consultaron el mismo bloque antes de que otra reserve o termine de guardar.
No sustituye el negocio ni los datos de ningún microservicio.

Solo se permiten conexiones PostgreSQL locales. Las migraciones se aplican en dos
esquemas aleatorios `test_flujo_materias_<uuid>` y `test_flujo_sesiones_<uuid>`, con
clientes separados. Se compara el contenido de todas las tablas de `public` antes
y después; los esquemas se eliminan y los servidores se cierran incluso cuando
falla una aserción. No se migran ni se siembran las tablas habituales.

## Fallos encontrados y correcciones

- **Horarios solapados:** una edición podía devolver `200` y superponer dos
  bloques. Además, comprobar antes de insertar no protege dos altas simultáneas.
  El adaptador de disponibilidad ahora obtiene un bloqueo transaccional por tutor
  y vuelve a comprobar el intervalo dentro de la misma transacción que escribe.
  Se permiten intervalos adyacentes y tutores diferentes; los solapamientos devuelven `409`.
- **Repeticiones internas concurrentes:** reservar o liberar varias veces el mismo
  bloque podía devolver una mezcla de `200` y `409` aunque todas las peticiones
  pidieran el mismo estado. Tras perder la escritura condicional se consulta de
  nuevo: si ya está en el estado solicitado, se confirma el mismo resultado.
  Un bloque inactivo continúa rechazando la reserva.
- **Compensación de una creación perdedora:** una solicitud concurrente que fallaba
  al guardar liberaba el bloque de la solicitud ganadora. La prueba reprodujo una
  sesión pendiente con su bloque `DISPONIBLE`. Sesiones ahora comprueba si existe
  una sesión activa antes de compensar. Si no puede comprobarlo, devuelve un error
  controlado y conserva la reserva en lugar de liberarla a ciegas.
- **Contención entre escrituras independientes:** cinco tutores distintos podían
  agotar los tres reintentos serializables y recibir `409`. La unidad de trabajo
  mantiene el aislamiento serializable y permite hasta seis intentos con espera
  exponencial acotada y variación aleatoria. Solo reintenta abortos de transacción
  reconocidos; no repite HTTP, errores de negocio ni pérdidas de conexión.

La regresión histórica de Sesiones también necesitó incluir el esquema de prueba
principal al resolver las funciones de `uuid-ossp` desde su segundo esquema. No se
cambió el SQL de migraciones ni se instaló esa extensión en `public`.

## Qué significa idempotencia en esta comprobación

Se verifica el efecto persistido, no solo el código HTTP:

- Doce altas idénticas, sincronizadas después de leer, dejan un único bloque.
- Dos ediciones hacia el mismo intervalo libre dejan una sola ocupación.
- Desactivaciones repetidas conservan una única fila inactiva.
- Reservas y liberaciones internas idénticas devuelven `200`, sin nuevos registros.
- Crear o aceptar de nuevo una solicitud no crea sesiones ni transiciones adicionales.
- Seis creaciones en vuelo al mismo bloque conservan una sesión y su reserva.
- Rechazos concurrentes dejan una sesión rechazada y una única liberación durable;
  el bloque puede solicitarse de nuevo sin que un reenvío antiguo lo libere.
- Un JWT ausente o un tutor ajeno no cambia los datos.

Crear, aceptar, rechazar y desactivar conservan sus contratos: una repetición puede
responder `409` sin duplicar efectos. No se añadió `Idempotency-Key` ni una caché
de respuestas HTTP. El PATCH interno sigue siendo un contrato de estados sin
identificador propietario de reserva; la prueba no acredita tolerancia a cualquier
reordenamiento o pérdida de mensajes entre servicios.

## Carga y resultados

Los tiempos se miden desde el cliente HTTP hasta leer el JSON completo, pasando
por el Gateway. Cada escenario tiene cinco operaciones de calentamiento excluidas.
Las lecturas usan 200 tutores habilitados, 1.000 bloques y un historial de 500
sesiones más una confirmada. Se toman 100 muestras por operación, en lotes de diez.
Las escrituras usan 35 tutores/estudiantes diferentes: cinco calentamientos y 30
muestras por etapa, en lotes de cinco, con 35 sesiones finalmente confirmadas y
35 bloques reservados.

Presupuestos locales de regresión: p95 menor que 1.000 ms para lecturas, 1.500 ms
para aceptación repetida y 2.000 ms para escrituras exitosas. Son límites de esta
suite, no una certificación de capacidad ni un SLA de producción.

Ejecución de referencia con las correcciones:

- Buscar tutores paginados: p50 **47,10 ms**, p95 **65,66 ms**, p99 **65,91 ms**.
- Consultar disponibilidad: p50 **12,83 ms**, p95 **29,54 ms**, p99 **29,72 ms**.
- Historial del tutor: p50 **89,46 ms**, p95 **116,57 ms**, p99 **120,47 ms**.
- Aceptación repetida sin nuevos efectos: p95 **17,39 ms**.
- Crear bloque: p95 **36,30 ms**.
- Crear solicitud y reservar: p95 **276,26 ms**.
- Aceptar solicitud: p95 **200,94 ms**.

La ejecución final de confirmación también aprobó los once casos. Sus p95 fueron
185,14 ms en búsqueda, 46,66 ms en disponibilidad, 745,57 ms en historial,
105,77 ms en aceptación repetida, 271,79 ms al crear bloques, 689,42 ms al crear
solicitudes y 314,05 ms al aceptarlas. La diferencia entre ejecuciones muestra por
qué se conservan presupuestos explícitos y no se presenta un tiempo local como
capacidad garantizada del sistema.

Cada ejecución imprime p50, p95, p99, máximo, solicitudes por segundo y códigos
esperados. No hay reenvíos automáticos del cliente de carga. Los resultados son
locales, con la base preparada y sin navegador, red WAN ni carga sostenida.

## Reproducir

Usa Node compatible con los proyectos y dependencias instaladas en los tres
servicios. Las carpetas deben contener las versiones de código que se desea probar;
hay que compilar Sesiones y Gateway antes de ejecutar la suite. El comando de
Materias compila su propio código automáticamente.

Desde `materias-tutores`, en la disposición local usada para esta revisión:

```powershell
$env:SESIONES_PROJECT_DIR = (Resolve-Path '..\.worktrees\flujo-tutor-sesiones\agendamiento-sesiones').Path
$env:GATEWAY_PROJECT_DIR = (Resolve-Path '..\..\..\apiGateway\api-gateway').Path
npm.cmd --prefix $env:SESIONES_PROJECT_DIR run build
npm.cmd --prefix $env:GATEWAY_PROJECT_DIR run build
npm.cmd run test:flujo-tutor
```

En otra disposición, asigna las rutas absolutas de tus copias de Sesiones y Gateway.
La conexión se toma de `TEST_DATABASE_URL` o de `DATABASE_URL`, en el entorno o en
el `.env` de Materias. Una conexión remota se rechaza antes de crear esquemas.
Ejecuta estas suites de base de datos por separado: las migraciones históricas de
Sesiones incluyen una extensión de PostgreSQL compartida a nivel de base.

Validación adicional realizada:

- Materias: **161 pruebas unitarias**, **83 HTTP** y **12 de disponibilidad/PostgreSQL**.
- Sesiones: **95 pruebas unitarias** y **131 HTTP/PostgreSQL**.
- Flujo integrado: **11 casos**, incluidas las dos pruebas de carga.
- Build y lint de ambos micros correctos.

Los fallos HTTP y de base inducidos por las suites históricas generan logs de error
esperados; el resultado de la suite determina si la comprobación pasó.
