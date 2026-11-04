# API Gateway de STUDIA

Punto de entrada HTTP del frontend hacia los cuatro microservicios. Implementado
con NestJS, transmite las peticiones y respuestas sin aplicar reglas de negocio,
validaciones de datos ni permisos. Los microservicios conservan esas tareas y
siguen comunicándose directamente entre ellos. El Gateway no necesita PostgreSQL
ni un secreto para firmar o verificar JWT.

## Arranque local

Requiere Node.js 22.12 o superior y npm. Desde la raíz de la rama `apigateway`:

```bash
cd api-gateway
npm ci
cp .env.example .env
npm run start:dev
```

Copia `.env.example` solo si todavía no existe `.env`; conserva tus valores
locales. En PowerShell puedes usar `Copy-Item .env.example .env`.

El puerto predeterminado es `8080`. La aplicación arranca incluso sin levantar
los microservicios o completar sus direcciones.

```bash
curl http://localhost:8080/api/health
```

Respuesta:

```json
{
  "estado": "ok",
  "servicio": "api-gateway"
}
```

Esta ruta comprueba el Gateway; no consulta la salud de los microservicios.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto del Gateway; entero entre 1 y 65535. Predeterminado: `8080`. |
| `USUARIOS_AUTH_URL` | URL base del micro de usuarios/autenticación. |
| `MATERIAS_TUTORES_URL` | URL base del micro de materias/tutores. |
| `AGENDAMIENTO_SESIONES_URL` | URL base del micro de agendamiento/sesiones. |
| `REPORTES_MODERACION_URL` | URL base del micro de reportes/moderación. |
| `CORS_ORIGIN` | Origen permitido del frontend. Predeterminado: `http://localhost:5173`. |
| `HTTP_TIMEOUT_MS` | Plazo total de cada petición al micro, en milisegundos. Predeterminado: `10000`. |

Las URL de los micros pueden quedar vacías; una llamada a un servicio sin
configurar devuelve `503`. Si se completan, deben usar HTTP o HTTPS. Admiten
una ruta base opcional, como `http://localhost:3001/api`, sin consulta ni
fragmento. Una configuración inválida impide el arranque.

`HTTP_TIMEOUT_MS` debe ser un entero entre 1 y 2147483647. `CORS_ORIGIN` debe
contener un único origen HTTP(S), sin ruta ni barra final. También admite `*`
para permitir cualquier origen. CORS permite `Authorization`, `Content-Type`
y los demás encabezados solicitados en el preflight. El navegador puede usar
GET, HEAD, POST, PUT, PATCH y DELETE. El JWT se transmite mediante
`Authorization: Bearer <token>`; no se habilitan credenciales CORS para cookies.
CORS es una política del navegador, no un mecanismo de autenticación.

Los valores locales se guardan en `.env`, excluido de Git. `.env.example`
contiene la plantilla compartida.

## Rutas y reenvío

| Prefijo público | URL base de destino |
| --- | --- |
| `/api/usuarios-auth` | `USUARIOS_AUTH_URL` |
| `/api/materias-tutores` | `MATERIAS_TUTORES_URL` |
| `/api/agendamiento-sesiones` | `AGENDAMIENTO_SESIONES_URL` |
| `/api/reportes-moderacion` | `REPORTES_MODERACION_URL` |

El Gateway retira `/api` y el segmento que identifica al servicio. Agrega el
resto de la ruta a la URL base configurada, conservando la consulta, los
parámetros repetidos y los caracteres escapados. Si no queda una ruta, utiliza
`/`. No crea endpoints de negocio ni necesita conocer las rutas internas.

Por ejemplo, con `USUARIOS_AUTH_URL=http://localhost:3001`:

```text
GET /api/usuarios-auth/usuarios/42?detalle=true
 -> GET http://localhost:3001/usuarios/42?detalle=true
```

Si el micro ya utiliza el prefijo `/api`, configura
`USUARIOS_AUTH_URL=http://localhost:3001/api`:

```text
GET /api/usuarios-auth/usuarios/42?detalle=true
 -> GET http://localhost:3001/api/usuarios/42?detalle=true
```

Cada integrante debe completar la URL de su micro y conectar sus pantallas
con el prefijo correspondiente. El resto de la ruta debe coincidir con un
endpoint real de ese microservicio.

```bash
curl -i "http://localhost:8080/api/usuarios-auth/usuarios/42?detalle=true" \
  -H "Authorization: Bearer <token>"
```

Se conservan el método, `Authorization`, los encabezados pertinentes y los
bytes del cuerpo, incluidos JSON, formularios, multipart y archivos. El cuerpo
se transmite como un flujo sin parsearlo ni cargarlo completo en memoria.
El micro recibe el encabezado `Host` de su propia dirección.

La respuesta conserva el estado HTTP, el cuerpo y encabezados como
`Content-Type`, `Content-Encoding`, `Set-Cookie` y `Location`. Los errores de
negocio o autenticación del micro (por ejemplo, `400`, `401` o `403`) se
devuelven tal como llegan. Las redirecciones se devuelven sin seguirlas ni
reescribir `Location`. Se excluyen encabezados propios de cada conexión y
los encabezados CORS del micro, porque CORS lo controla el Gateway.

El preflight `OPTIONS` lo responde el Gateway sin consultar al microservicio.
Las rutas desconocidas devuelven `404`. Esta implementación cubre HTTP(S);
no implementa conexiones WebSocket.

## Errores de comunicación

| Estado | Situación |
| --- | --- |
| `503` | La URL del servicio está vacía. |
| `502` | No se puede conectar o falla la comunicación antes de iniciar la respuesta. |
| `504` | El micro no inicia su respuesta dentro de `HTTP_TIMEOUT_MS`. |

Ejemplo:

```json
{"statusCode":503,"mensaje":"Servicio sin configurar.","servicio":"usuarios-auth"}
```

El plazo se cuenta desde la salida de la petición hasta completar la respuesta,
incluida su transmisión. Si se agota el plazo o se interrumpe el micro después
de haber enviado encabezados al frontend, el Gateway cierra la respuesta:
ya no es posible reemplazar su estado por `502` o `504`. Cuando el cliente
se desconecta, también se cancela la petición al micro. No se hacen reintentos
automáticos para evitar repetir operaciones.

## Arquitectura hexagonal

El núcleo depende de contratos propios y no importa NestJS, `ConfigService`,
`node:http` ni tipos como `IncomingMessage` o `ServerResponse`.

- **Dominio:** identifica los servicios y define peticiones, respuestas y errores
  de reenvío. Los cuerpos son flujos `AsyncIterable<Uint8Array>`.
- **Aplicación:** el caso de uso `ReenviarPeticion` identifica el servicio,
  retira el prefijo público y coordina la llamada mediante los puertos
  `ConfiguracionGatewayPuerto` y `ClienteHttpPuerto`.
- **Entrada HTTP:** el middleware transforma los objetos de Node al contrato
  del caso de uso, devuelve respuestas y traduce errores a `503`, `502` y `504`.
  El controlador de salud y la configuración CORS también están en la entrada.
- **Salida:** un adaptador obtiene las direcciones desde `ConfigService` y otro
  implementa el cliente con HTTP(S) de Node, streaming, cancelación y timeout.

`AppModule` conecta los puertos con sus adaptadores usando la inyección de
dependencias de NestJS. `crear-aplicacion.ts` configura la entrada HTTP y CORS.
Para cambiar la librería HTTP o el origen de configuración se reemplaza el
adaptador correspondiente, conservando el caso de uso.

```text
Petición HTTP -> Middleware -> ReenviarPeticion -> ClienteHttpPuerto
                                  |                    |
                       ConfiguracionGatewayPuerto      |
                                  |                    |
                       ConfiguracionEntornoAdapter     |
                                               ClienteHttpNodeAdapter -> Micro
```

## Estructura

```text
api-gateway/
├── src/
│   ├── dominio/
│   │   └── reenvio.ts
│   ├── aplicacion/
│   │   ├── casos-de-uso/reenviar-peticion.ts
│   │   └── puertos/
│   │       ├── cliente-http.puerto.ts
│   │       └── configuracion-gateway.puerto.ts
│   ├── infraestructura/
│   │   ├── adaptadores/
│   │   │   ├── entrada/
│   │   │   │   ├── reenvio.middleware.ts
│   │   │   │   └── salud.controller.ts
│   │   │   └── salida/
│   │   │       ├── configuracion-entorno.adapter.ts
│   │   │       └── cliente-http-node.adapter.ts
│   │   └── configuracion-entorno.ts
│   ├── app.module.ts
│   ├── crear-aplicacion.ts
│   └── main.ts
├── test/
│   ├── gateway.test.cjs
│   └── reenviar-peticion.test.cjs
├── .env.example
└── package.json
```

## Comandos de verificación

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

`npm test` compila y ejecuta pruebas del caso de uso con puertos en memoria,
además de pruebas HTTP con microservicios locales simulados.
Comprueba los cuatro destinos, rutas y consultas, JWT, métodos, cuerpos JSON y
multipart, respuestas binarias, encabezados, CORS, errores y tiempos de espera.
No requiere servicios externos, PostgreSQL ni dependencias adicionales.

Para iniciar la versión compilada:

```bash
npm run start:prod
```

El trabajo se limita a `api-gateway/`, en la rama `apigateway`. Verifica la rama
antes de cualquier commit, conserva cambios ajenos y no integres ni hagas push
a `main`.
