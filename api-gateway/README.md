# API Gateway de STUDIA

Proyecto base de NestJS para que Renato y Sergio preparen el punto de entrada
de la web. Esta etapa incluye el arranque, la configuración de entorno y una
ruta de salud. El reenvío hacia los microservicios corresponde a la siguiente
tarea de Sergio.

## Arranque local

Requiere Node.js 22.12 o superior y npm. Desde la raíz de la rama `apigateway`:

```bash
cd api-gateway
npm ci
cp .env.example .env
npm run start:dev
```

El puerto predeterminado es `8080`. Para cambiarlo, edita `PORT` en `.env`.
La base arranca sin PostgreSQL y sin levantar los microservicios.

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

Esta ruta confirma que el Gateway está funcionando. El estado de los
microservicios todavía no se consulta.

## Variables de entorno

| Variable                    | Uso                                                           |
| --------------------------- | ------------------------------------------------------------- |
| `PORT`                      | Puerto del Gateway; entero entre 1 y 65535.                   |
| `USUARIOS_AUTH_URL`         | Dirección base de usuarios/autenticación.                     |
| `MATERIAS_TUTORES_URL`      | Dirección base de materias-tutores.                           |
| `AGENDAMIENTO_SESIONES_URL` | Dirección base de agendamiento-sesiones.                      |
| `REPORTES_MODERACION_URL`   | Dirección base de reportes/moderación.                        |
| `CORS_ORIGIN`               | Origen previsto del frontend; reservado para configurar CORS. |

Las direcciones pueden quedar vacías mientras se crea la base. Si se indica
una dirección, se valida que utilice HTTP o HTTPS. El reenvío utilizará esas
variables cuando se implemente.

Los valores locales se guardan en `.env`, excluido de Git. `.env.example`
contiene la plantilla compartida. El Gateway no necesita credenciales de
PostgreSQL ni secretos de firma JWT para esta etapa.

## Estructura

```text
api-gateway/
├── src/
│   ├── configuracion/configuracion-entorno.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.example
└── package.json
```

## Comandos de verificación

```bash
npm run lint
npm run typecheck
npm run build
npm run start:prod
```

## Siguiente tarea

Sergio preparará el reenvío HTTP configurable, CORS y la conservación del
encabezado `Authorization`, parámetros, cuerpos y respuestas. Después, cada
integrante conectará las rutas que necesite para sus pantallas.

El prefijo público de la base es `/api`. El reenvío deberá acordar cómo
retirarlo antes de llamar a cada micro. Por ahora, `/api/health` es la única
ruta implementada.

El trabajo de este proyecto se realiza en la rama `apigateway`.
