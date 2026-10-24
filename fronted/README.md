# Web de Tutorías

Aplicación React + TypeScript. Las consultas al backend pasan por la API Gateway.

## Layout global y verificación visual

Las rutas comparten encabezado, navegación y pie. El layout sigue los mockups de
Inicio, Autenticación y Registro. `/verificar-cuenta` reutiliza el panel azul y
la tarjeta blanca. La confirmación del correo y la solicitud de un nuevo enlace
se conectan a Auth exclusivamente mediante el Gateway.

Para revisar esta parte visual no necesitas Gateway ni microservicios:

```powershell
npm.cmd run dev -- --port 5173 --strictPort
```

Abre `http://localhost:5173/login`, `/registro` o `/verificar-cuenta`.
En desarrollo, prueba `/verificar-cuenta?vista=verificada` cambiando el valor por
`pendiente`, `verificando`, `vencida`, `invalida`, `utilizada` o `error`. Son demostraciones:
no validan tokens, no llaman a la API ni modifican cuentas. En producción se ignora
el parámetro de demostración. Un token real siempre prevalece sobre `vista`.
La barra de vistas del equipo se habilita
solo en desarrollo con `/login?vistas=1`.

Comprueba el menú a 320, 375 y 768 px, la distribución a 1440 y 1920 px, el foco
con Tab y los enlaces de regreso. Cada pantalla debe tener una sola cabecera y pie.
Disponibilidad conserva su tema y formularios; la sesión existente configura el
menú por rol. Soporte y Privacidad se muestran sin destino hasta su implementación.

La presentación permanece en `shared/layout` y `features/verificacion-cuenta`.
El contenedor lee la URL y coordina las acciones mediante `VerificacionCuentaPuerto`;
la página presenta mensajes y formularios. El adaptador HTTP implementa el puerto
y `AppRoutes` lo conecta. Las validaciones de negocio permanecen en Auth.

### Probar la verificación de correo

Configura estas variables en los archivos locales correspondientes (conserva los
demás valores; usa un puerto libre para Auth):

```dotenv
# Web: fronted/.env.local
VITE_API_BASE_URL=http://localhost:8080/api
# Gateway: api-gateway/.env
USUARIOS_AUTH_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:5173
# Auth: usuarios-auth/.env
PORT=3002
EMAIL_VERIFICATION_URL=http://localhost:5173/verificar-cuenta
```

Auth necesita además su base de datos, SMTP y secretos ya configurados. El enlace
del correo debe apuntar a la web; las peticiones de la web apuntan al Gateway.
Reinicia los procesos después de cambiar sus variables.

1. Inicia Auth, Gateway y la web. Abre `/verificar-cuenta`, introduce el correo de
   una cuenta de prueba sin verificar y pulsa **Solicitar nuevo enlace**.
2. En Red del navegador comprueba `POST /api/usuarios-auth/auth/reenviar-verificacion`,
   cuerpo `{ "correo_institucional": "..." }` y respuesta `202`. El mensaje es
   neutro tanto si la cuenta existe como si no; no garantiza la entrega del correo.
3. Abre el enlace recibido (`/verificar-cuenta?token=...`) y pulsa **Confirmar correo**.
   Debe salir un único `POST /api/usuarios-auth/auth/verificar-correo`, cuerpo
   `{ "token": "..." }`, sin JWT. El `200` muestra la confirmación; la pantalla no
   inicia sesión automáticamente.
4. Recarga el mismo enlace y vuelve a confirmar: `409` muestra enlace utilizado.
   Un token inexistente da `400`; uno vencido da `410`. Usa cuentas y enlaces de
   prueba para estos casos. Apaga Auth para comprobar el error de comunicación.

Las llamadas tienen un límite de 15 segundos, se cancelan al salir y no se
reintentan automáticamente. Abrir o recargar el enlace no consume el token: se
requiere pulsar Confirmar. Tras solicitar otro enlace hay que abrir el más reciente.
Las vistas `?vista=...` sin token solo permiten revisar el diseño en desarrollo y
deshabilitan las acciones. El login y registro del equipo conservan su integración
pendiente: esta tarea conecta únicamente la verificación y el reenvío.

Se comprobó el recorrido desde Chrome con el Gateway y el controlador/servicio
reales de Auth, sustituyendo persistencia y SMTP por datos en memoria. Esto cubre
confirmación, reenvío y errores; no comprueba la entrega con un proveedor SMTP real.

Para ejecutar las pruebas sin servicios, configura la base pública utilizada por
sus respuestas HTTP simuladas: `$env:VITE_API_BASE_URL = 'http://localhost:8080/api'`;
después ejecuta `npm.cmd test`, `npm.cmd run build` y `npm.cmd run lint`.

## Requisitos e instalación de la web

Requiere **Node.js 22.22.0 o superior**; se recomienda Node.js 24 LTS. React Router exige ese mínimo. Comprueba tu versión con `node --version`.

Desde la carpeta `fronted`, instala las versiones fijadas en `package-lock.json` y prepara la configuración local:

```powershell
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env.local')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
```

Si `.env.local` ya existe, conserva su contenido. Ajusta `VITE_API_BASE_URL` al Gateway de tu entorno. Este archivo es local y no se publica; `.env.example` es la plantilla compartida.

Para una instalación nueva del Gateway, ejecuta también `npm.cmd ci` desde su carpeta `api-gateway` y prepara su `.env` según la sección de configuración. El micro debe tener sus propias dependencias y configuración listas.

## Probar el catálogo y el buscador localmente

Necesitas PostgreSQL accesible para el micro de Materias/Tutores y su configuración local existente. Este flujo solo consulta datos; no ejecuta migraciones ni semillas.

Abre tres terminales:

1. En `D:\Web\Taller de integracion II\micro\Integracion-IV-x-II\materias-tutores`, ejecuta `npm.cmd run start:dev`. El micro local utiliza el puerto 3000.
2. En `D:\Web\Taller de integracion II\apiGateway\api-gateway`, ejecuta `npm.cmd run start:dev`. El Gateway local utiliza el puerto 8080.
3. En esta carpeta `fronted`, ejecuta `npm.cmd run dev -- --port 5173 --strictPort`.

Abre **http://localhost:5173/materias**. La raíz `/` conserva las pantallas de acceso del equipo.

El buscador está en `/tutores`: carga el catálogo para seleccionar una materia y consulta sus tutores al pulsar Buscar. Las tarjetas del catálogo abren directamente `/tutores?materiaId=...&page=1`. La materia y la página quedan en la URL para compartir la búsqueda y navegar con Atrás/Adelante.

La pantalla de disponibilidad incorporada desde la rama del equipo se conserva en `/disponibilidad`, con su tema, lógica y componentes existentes. El layout compartido añade una sola cabecera y un solo pie a todas las rutas.

Las pantallas del equipo permanecen en `App.tsx`, junto con su `BrowserRouter` y sus rutas originales de selección en `/solicitudes/nueva`, disponibilidad en `/disponibilidad` y acceso general mediante `/*` (incluidos `/` y `/login`). El registro tiene además la ruta `/registro`; la postulación conserva su acceso desde los controles del equipo. `app/AppRoutes.tsx` reúne las rutas de materias, tutores, solicitudes recibidas y verificación, y recibe las rutas del equipo desde `App.tsx`, todas bajo `TutoriasLayout`.

El login incorporado desde Web todavía es una demostración: guarda `fake-jwt-token` en `localStorage` y no consulta Auth. Ese valor no sirve para operaciones autenticadas reales. La selección de tutoría conserva el identificador de materia fijo del código del equipo; su adaptación a una materia seleccionada requiere una integración posterior.

El recorrido de la consulta es:

```text
Web → http://localhost:8080/api/materias-tutores/materias
    → http://localhost:3000/materias
    → PostgreSQL
```

La consulta de tutores usa el mismo recorrido: `GET /api/materias-tutores/tutores?materiaId=...&page=1&limit=10` en el Gateway, que la reenvía a `GET /tutores` del micro. Es necesario ejecutar la versión del micro que incluye `idMateria` en el catálogo.

Puedes comprobar el Gateway en http://localhost:8080/api/health. Esa ruta comprueba el Gateway; el catálogo confirma además la comunicación con el micro y su base de datos.

## Configuración local

El archivo `.env.local` de la web contiene:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api
```

Para otra instalación, usa `.env.example` como referencia y conserva los valores locales existentes. Reinicia Vite después de cambiar variables de entorno. Las variables `VITE_` son públicas en el navegador: no guardes secretos en ellas.

El `.env` local del Gateway debe incluir:

```dotenv
PORT=8080
MATERIAS_TUTORES_URL=http://localhost:3000
AGENDAMIENTO_SESIONES_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
HTTP_TIMEOUT_MS=5000
```

CORS debe coincidir con el origen exacto de la web. Usa `localhost:5173` al abrirla con la configuración anterior.

## Carga diferida de páginas

`App.tsx` y `app/AppRoutes.tsx` usan `React.lazy` para descargar las páginas al
visitar sus rutas. Login y registro comparten `components/PantallasEquipo.tsx`;
la postulación y disponibilidad se descargan cuando se abren. `TutoriasLayout`
mantiene la cabecera y el pie mientras `Suspense` muestra «Cargando página…».
Las consultas a la API y los controles de acceso conservan su comportamiento.

Para comprobar las descargas, ejecuta `npm.cmd run build` y después
`npm.cmd run preview -- --port 5173 --strictPort`, con el servidor de desarrollo
detenido. En el navegador abre `/login`, activa Network, deshabilita la caché y
recarga. Filtra los archivos JS: debe descargarse `PantallasEquipo`, mientras
que los módulos de catálogo, tutores y disponibilidad esperan a visitar sus rutas.
Los módulos compartidos también pueden descargarse como dependencias.
Al navegar a Materias debe aparecer `CatalogoMateriasContainer`; Atrás y Adelante
reutilizan los módulos ya cargados durante esa sesión. Recarga directamente
`/materias`, `/tutores`, `/solicitudes/recibidas`, `/verificar-cuenta`,
`/disponibilidad` y `/solicitudes/nueva` para comprobar sus accesos directos.
Con una conexión lenta debe poder verse el indicador durante la descarga.

## Paginación compartida

`src/shared/components/Paginacion.tsx` recibe `page` (desde 1), `totalPages` y
`onCambiarPagina`. Admite `etiqueta` para identificar el listado y `deshabilitada`
para bloquear ambos botones. Muestra Anterior, Siguiente y la página actual;
se oculta con menos de dos páginas o parámetros inválidos.

El componente presenta controles; cada pantalla administra sus datos y su página.
Solicitudes recibidas lo utiliza con su paginación local. `PaginacionTutores`
conserva la interfaz existente y delega en el control compartido, manteniendo
las consultas y los parámetros de URL del buscador.

## Organización de la consulta

- `src/config/api.ts` obtiene la dirección del Gateway.
- `features/materias/services/materias-api.ts` realiza la petición y valida `idMateria`, `codigo` y `nombre`.
- `features/materias/hooks/useMaterias.ts` gestiona carga, cancelación, error y reintento.
- `features/materias/containers/CatalogoMateriasContainer.tsx` entrega los resultados a la página por props.
- `features/materias/pages/CatalogoMateriasPage.tsx` muestra el catálogo y su búsqueda local.

El catálogo muestra estados de carga, error con Reintentar y lista vacía. No utiliza datos ficticios. Conserva una caché en memoria durante cinco minutos; una recarga completa del navegador elimina esa caché. Los reintentos fuerzan una consulta nueva.

- `features/tutores/services/tutores-api.ts` consulta exclusivamente el Gateway y valida resultados, identificadores, calificaciones, horarios y paginación.
- `features/tutores/hooks/useBuscarTutores.ts` administra carga, error, reintento y cancelación al cambiar de consulta o salir de la pantalla. Una respuesta anterior no reemplaza los resultados de la consulta actual.
- `features/tutores/containers/BuscarTutoresContainer.tsx` conecta materias, parámetros de URL y consulta con la página.
- `features/tutores/pages/BuscarTutoresPage.tsx` presenta el formulario, estados, tarjetas y paginación mediante componentes.
- `shared/utils/identificadores.ts` valida identificadores decimales sin convertirlos a `Number`.

Los tutores se consultan de diez en diez y no se cachean. La pantalla diferencia la carga inicial de materias, la búsqueda en curso, errores con reintento, una materia sin tutores y una página fuera de rango. Una nueva búsqueda vuelve a la primera página. Si la materia ya seleccionada sigue en la página uno, Buscar fuerza una nueva consulta.

## Alcance

El catálogo `/materias` consulta la API y conserva `idMateria` como texto decimal, sin convertirlo a `Number`. El formulario de tutores selecciona ese identificador y lo entrega como `materiaId`, compatible con `GET /api/materias-tutores/tutores?materiaId=...&page=1&limit=10`; muestra nombre y código como etiqueta.

La búsqueda por materia está conectada a la API. El endpoint actual entrega ID de tutor, promedio y cantidad de calificaciones, horarios y paginación; no entrega nombres. Las tarjetas muestran «Tutor» mientras no exista integración de perfiles. Ver perfil permanece deshabilitado hasta implementar su destino.

Los controles de disponibilidad, orden y calificación permanecen visibles pero deshabilitados, con una explicación, porque la API aún no admite esos filtros. No se filtra solamente la página actual ni se altera el total del servidor. La autenticación requiere su integración correspondiente; esta consulta utiliza el endpoint público actual y maneja respuestas 401/403 sin inventar credenciales.

## Verificación

### Solicitudes recibidas por el tutor

La pantalla está en `/solicitudes/recibidas`. Usa el contenido de `12T-S · Tutor / Solicitudes recibidas` de Figma; la cabecera y el pie los proporciona el layout común. Sus componentes están en `features/sesiones`: el servicio consulta, el hook gestiona el ciclo de carga, el contenedor conecta la sesión y el catálogo, y la página presenta los datos.

El recorrido es `GET /api/agendamiento-sesiones/sessions/history` en el Gateway hacia `GET /sessions/history` de Sesiones. El token se toma de la clave `token` de `localStorage`, que utiliza la autenticación existente. `shared/auth` interpreta `sub`, `roles` y vencimiento para presentar la interfaz; la firma, la identidad y el acceso a los datos se verifican en el backend. No se utiliza `userRole` como fuente de permisos. Al guardar o retirar un token en la misma pestaña, el login puede emitir `window.dispatchEvent(new Event('stp:sesion'))` para notificar el cambio.

Se muestran únicamente sesiones `PENDIENTE` cuyo `id_tutor` corresponde a `sub`. Las sesiones donde el usuario actúa como estudiante y los demás estados quedan fuera. Se ordenan por fecha de creación, mostrando primero las que cumplen antes el plazo de respuesta. El estado de expiración solo lo modifica el servidor: transcurridas 24 horas, una solicitud todavía `PENDIENTE` indica que espera actualización.

Los horarios se muestran en `America/Santiago`. El listado se actualiza manualmente, al recuperar el foco y cada minuto mientras la pestaña está visible. Las consultas anteriores se cancelan al cambiar de sesión, reintentar o salir. Los resultados no se cachean y se presentan diez filas por página; esta paginación es local porque el endpoint de historial actual no acepta paginación.

La API no incluye nombres de estudiantes: se muestra su identificador sin inventar nombres. Las materias se completan mediante el catálogo; si este no está disponible se muestra el ID de materia y el listado sigue funcionando. El servicio descarta campos adicionales de la respuesta.

Cada fila permite aceptar la solicitud mediante `PATCH /api/agendamiento-sesiones/sessions/:id/accept`, sin cuerpo y con el mismo token Bearer del tutor. El servicio valida el identificador y exige una respuesta de la misma sesión y tutor en estado `CONFIRMADA`. El backend verifica la firma, la propiedad de la solicitud, su estado y los solapamientos. El rechazo, el detalle y las pestañas Próximas e Historial siguen pendientes de sus respectivas tareas.

La aceptación muestra el estado Aceptando y bloquea acciones simultáneas, incluido el doble clic antes de que React vuelva a renderizar. Una confirmación válida elimina la fila de pendientes y actualiza el contador; después se consulta nuevamente el historial. Si ese refresco falla, se conserva la aceptación confirmada y se informa que el listado muestra los últimos datos conocidos. Las recargas manuales y automáticas no se ejecutan durante el PATCH.

Los errores 401/403 detienen nuevas acciones hasta cambiar de sesión. Los conflictos 409, solicitudes ausentes 404, fallos de red, timeout o respuestas inesperadas no se interpretan como éxito: se consulta el historial sin repetir automáticamente el PATCH. Si esa consulta falla, la aceptación queda bloqueada hasta obtener un listado actualizado. Al salir o cambiar de sesión se cancelan las operaciones y se descartan respuestas antiguas. La coordinación se encuentra en `features/sesiones/aplicacion/bandeja-solicitudes.ts`; el hook conecta sus operaciones con los servicios HTTP y publica el estado a React.

Para consultar datos reales, inicia Sesiones en 3001 con su base y configuración JWT, el Gateway en 8080 y la web. Se requiere un JWT vigente emitido por Auth con rol TUTOR. El login de demostración incorporado desde Web **todavía no obtiene ese token**, por lo que no permite validar el flujo completo de autenticación. La pantalla informa que hay que iniciar sesión si el token está ausente, es ficticio o venció; también distingue 401, 403, errores de consulta y lista vacía.

Las pruebas automatizadas cubren filtrado por identidad/estado, contrato HTTP, precisión BIGINT, plazos, zona horaria, errores, cancelación, timeout, presentación y rutas. Se comprobó además el recorrido HTTP con los módulos reales de Gateway y Sesiones, un JWT firmado con un secreto exclusivo de prueba y Prisma sustituido por un fixture. Esa comprobación no valida el login real ni la apariencia en navegador.

Para la aceptación, `test/aceptar-solicitud.test.mjs` cubre el contrato PATCH, la validación de la confirmación, doble clic, sincronización del listado, errores, resultados inciertos y cancelación. También se comprobó por HTTP el recorrido del frontend a través del Gateway hasta el controller, guard JWT y caso de uso reales de Sesiones, con persistencia sustituida por un repositorio de prueba: transición a CONFIRMADA, recarga y respuestas 401/403/409. No se utilizaron ni modificaron datos de PostgreSQL. Para validar el flujo con una cuenta real, debe existir una solicitud pendiente dirigida al tutor autenticado.

### Llamadas compartidas para revisar postulaciones

`features/postulaciones/index.ts` expone `aprobarPostulacion`, `rechazarPostulacion`, el tipo `Postulacion` y `ErrorRevisionPostulacion`. Las acciones del panel administrativo pueden importarlos sin depender de un componente visual:

```ts
import {
  aprobarPostulacion,
  rechazarPostulacion,
  ErrorRevisionPostulacion,
} from '../features/postulaciones'

const resultado = decision === 'aprobar'
  ? await aprobarPostulacion(idPostulacion, notaAcreditada, sesion, controlador.signal)
  : await rechazarPostulacion(idPostulacion, motivoRechazo, sesion, controlador.signal)
```

`sesion` es la identidad vigente obtenida de `shared/auth`. Las funciones comprueban sesión, identificadores y rol `ADMINISTRADOR`/`ADMIN` para la interfaz; el backend verifica el JWT y la autorización real. Los IDs se conservan como texto decimal. La aprobación exige una nota numérica entre 5,0 y 7,0, con un máximo de un decimal. El rechazo exige un motivo de 3 a 500 caracteres después de quitar espacios externos.

Las peticiones se envían exclusivamente al Gateway como `PATCH /api/materias-tutores/postulaciones/:id/aprobar` con `{ notaAcreditada }`, o `PATCH /api/materias-tutores/postulaciones/:id/rechazar` con `{ motivoRechazo }`. Ambas incluyen Bearer y JSON. Solo se acepta como confirmación una respuesta pública válida de la postulación solicitada, revisada por ese administrador y con el estado y los datos de revisión correspondientes. Se descartan campos adicionales. No se añadieron pantallas, rutas ni cambios al formulario de postulación del equipo.

`ErrorRevisionPostulacion` ofrece `tipo`, `decision`, `estadoHttp` y `requiereActualizar`. El panel debe presentar el mensaje y refrescar su consulta si `requiereActualizar` es `true`, antes de permitir otra decisión sobre esa postulación. Un 503 de aprobación puede ocurrir después de persistir `PENDIENTE_ROL`; no implica que no hubo cambios ni confirma una habilitación completa. La consulta administrativa existente es `GET /postulaciones/pendientes` del micro y también incluye `PENDIENTE_ROL`. En ese estado el backend dispone de `POST /postulaciones/:id/reintentar-rol`; repetir la aprobación no sustituye esa operación.

Se limita la espera a diez segundos y se bloquean revisiones simultáneas de la misma postulación por el mismo administrador dentro de este cliente. No hay reintentos automáticos de PATCH. Las peticiones pueden cancelarse mediante `AbortSignal`; si la cancelación ocurre después del envío, no garantiza que el servidor haya revertido la operación: al volver al panel debe consultarse el estado. La concurrencia entre clientes se controla en el backend.

`test/revision-postulaciones.test.mjs` verifica los contratos, BIGINT, datos y roles, respuestas, errores, cancelación, timeout y bloqueo de decisiones simultáneas. Se comprobó además el recorrido HTTP con el Gateway, el controller, el guard JWT y el servicio reales de materias-tutores, usando persistencia y asignación de roles de prueba. La aprobación y el rechazo se confirmaron; el caso 503 conservó `PENDIENTE_ROL` sin habilitar al tutor. Esa prueba no modifica cuentas ni bases reales y no sustituye la comprobación de la integración real de asignación de roles en Auth.

### Comandos

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

Las pruebas usan el ejecutor incluido en Node.js y Vite para cargar los módulos TypeScript, sin dependencias adicionales. Cubren el contrato HTTP con respuestas controladas, parámetros de URL, cancelación, timeout y presentación de estados. Para comprobar el recorrido real, inicia los tres procesos anteriores y busca una materia. Si no tiene tutores habilitados en la base, se mostrará el estado sin resultados; para comprobar tarjetas reales debe existir una habilitación vigente.
