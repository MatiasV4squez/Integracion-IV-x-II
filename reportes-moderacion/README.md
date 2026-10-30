# Reportes y Moderación

Microservicio del proyecto STP (Sistema de Tutorías entre Pares) encargado de
los reportes de conducta entre usuarios, su resolución por parte de
administradores (Desestimar, Advertir, Suspender), la reactivación de
suspensiones y la recepción de los avisos de conflicto y resolución de sesiones
emitidos por `agendamiento-sesiones`.

Está construido con NestJS y sigue arquitectura hexagonal: cada contexto
(`reportes`, `integraciones`) separa `dominio`, `aplicacion` e
`infraestructura`, con puertos definidos en el dominio e implementaciones
inyectadas mediante símbolos.

## Requisitos

- Node.js 22 o superior
- Docker (para PostgreSQL 15)

## Puesta en marcha

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:migrate
npm run start:dev
```

El servicio escucha en `http://localhost:3000` (configurable con `PORT`).
La base de datos queda expuesta en el puerto `5433`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL (ver `docker-compose.yml`). |
| `PORT` | Puerto HTTP del servicio (por defecto `3000`). |
| `JWT_SECRET` | Secreto HS256 de los tokens emitidos por `usuarios-auth`. |
| `SESIONES_SERVICE_URL` | Base HTTP de `agendamiento-sesiones` para validar sesiones antes de un reporte. |
| `USUARIOS_AUTH_URL` | Base HTTP de `usuarios-auth` para suspensiones y reactivaciones. |
| `INTERNAL_SERVICE_API_KEY` | Clave interna para llamar a `usuarios-auth`. |
| `MODERACION_INTEGRACION_SECRET` | Secreto compartido (mínimo 32 bytes) con el que `agendamiento-sesiones` firma sus avisos. |

## Endpoints

### Reportes

| Método y ruta | Acceso | Descripción |
| --- | --- | --- |
| `POST /reportes` | JWT de cualquier usuario autenticado | Crea un reporte. El reportador se toma del token; debe ser participante de una sesión confirmada y el reportado debe ser su contraparte. Cuerpo: `titulo`, `descripcion`, `id_sesion`, `id_usuario_reportado`. |
| `GET /reportes/admin` | JWT con rol `ADMINISTRADOR` | Consulta paginada de reportes con filtros `estado`, `fecha_desde`, `fecha_hasta`, `pagina`, `limite`. Incluye `conflictos_sesion`: conflictos de cierre recibidos de agendamiento que aún no tienen resolución. |
| `PATCH /reportes/:id/resolucion` | JWT con rol `ADMINISTRADOR` | Resuelve un reporte pendiente (`DESESTIMADO`, `ADVERTIDO`, `SUSPENDIDO`) con `motivo` opcional. |
| `PATCH /reportes/:id/reactivacion` | JWT con rol `ADMINISTRADOR` | Reactiva la suspensión asociada a un reporte. |

### Integraciones (consumo interno de `agendamiento-sesiones`)

Rutas protegidas con el header `X-Integracion-Secret` comparado contra
`MODERACION_INTEGRACION_SECRET`. Son idempotentes: un aviso repetido por
`id_aviso` responde 200 sin duplicar datos.

| Método y ruta | Descripción |
| --- | --- |
| `POST /integraciones/sesiones/conflictos` | Registra un aviso `CONFLICTO_DETECTADO` con las declaraciones en conflicto. |
| `POST /integraciones/sesiones/resoluciones` | Registra un aviso `CONFLICTO_RESUELTO` con el detalle de la resolución. |

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run db:migrate` | Aplica las migraciones de `prisma/migrations` (`prisma migrate deploy`). |
| `npm run start:dev` | Levanta el servicio en modo watch. |
| `npm run build` | Compila el proyecto en `dist/`. |
| `npm test` | Ejecuta las pruebas unitarias (Vitest). |
| `npm run test:cov` | Ejecuta las pruebas con cobertura. |
| `npm run test:e2e` | Ejecuta las pruebas de extremo a extremo. |
| `npm run lint` | Ejecuta oxlint con análisis de tipos. |

## Base de datos

Esquema Prisma con PostgreSQL (`prisma/schema.prisma`):

- `Reporte`: reportes de conducta y su resolución/reactivación.
- `aviso_sesion`: proyección de los avisos de conflicto y resolución de
  sesiones enviados por `agendamiento-sesiones`, con `idAviso` único para
  deduplicar reintentos.
