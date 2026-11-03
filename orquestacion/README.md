# Orquestación de Studia

Levanta todo el sistema con un solo comando: PostgreSQL, los 4 microservicios, el API Gateway,
Mailpit (correos de verificación), la app web y las cuentas de prueba.

```
                 navegador ──► app (nginx, :8081) ──► api-gateway (:8080)
                                                          │
          ┌───────────────┬────────────────┬──────────────┴────────┐
          ▼               ▼                ▼                       ▼
   usuarios-auth   materias-tutores   agendamiento-sesiones   reportes-moderacion
          │               │                │                       │
          └───────────────┴──── db (PostgreSQL, 4 bases) ──────────┘
   usuarios-auth ──► mailpit (:8025)
```

Cada microservicio se construye **desde su rama de GitHub** (`micro.Dockerfile`): no hace falta tener
el código del backend en tu PC y no se modifica. Al arrancar, cada micro aplica sus migraciones;
materias-tutores carga además las materias iniciales.

## Requisitos

| | Windows | Linux |
|---|---|---|
| Contenedores | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con WSL 2, que el instalador activa) | Docker Engine con el plugin Compose, **o** Podman + `podman-compose` (`pip install --user podman-compose`) |
| Comando | `docker compose` | `docker compose` (o `podman-compose`) |

No hace falta Node ni el código del backend: todo se construye dentro de los contenedores.
La primera vez descarga y compila todo (varios minutos); las siguientes arrancan en segundos.

## Uso

**Windows (PowerShell):**

```powershell
cd orquestacion
Copy-Item .env.example .env      # opcional: puertos, secretos y ramas
docker compose up --build -d
docker compose logs seed         # muestra las cuentas cuando están listas
```

**Linux:**

```bash
cd orquestacion
cp .env.example .env             # opcional
docker compose up --build -d     # o: podman-compose up --build -d
docker compose logs seed         # o: podman logs orquestacion_seed_1
```

| Qué | Dónde |
|---|---|
| App web | http://localhost:8081 |
| API Gateway | http://localhost:8080/api/health |
| Correos de verificación (Mailpit) | http://localhost:8025 |

| Acción | Comando (`docker compose` o `podman-compose`) |
|---|---|
| Detener | `docker compose down` |
| Detener y borrar los datos | `docker compose down -v` |
| Volver a levantar (sin compilar) | `docker compose up -d` |
| Recompilar la app tras cambiar su código | `docker compose up --build -d app` |

## Cuentas de prueba

El servicio `seed` las crea con los mismos flujos de la app (registro, postulación con certificado y
aprobación del administrador). Se puede repetir: lo que ya existe no se duplica.

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `estudiante@alu.uct.cl` | `Estudiante123` |
| Estudiante | `estudiante2@alu.uct.cl` | `Estudiante123` |
| Tutor (Programación III, Sistemas Inteligentes) | `tutor@alu.uct.cl` | `Tutor1234` |
| Tutora (Programación III, Cálculo Intermedio) | `tutor2@alu.uct.cl` | `Tutor1234` |
| Administrador | `admin@alu.uct.cl` | `Admin1234` |

No existe un endpoint para crear administradores: el seed asigna ese rol directo en la base de datos.

## Usar la app desde el celular

Primero averigua la IP de tu PC: en Windows `ipconfig` (Dirección IPv4 del Wi-Fi); en Linux `hostname -I`.

- **App web en el celular:** en `.env` pon `APP_API_URL=http://<IP de tu PC>:8080/api`, recompila la app
  (`docker compose up --build -d app`) y abre `http://<IP de tu PC>:8081` en el navegador del celular.
- **Expo Go:** deja corriendo la orquestación; en `proyect-app-studia/.env.local` pon
  `EXPO_PUBLIC_API_URL=http://<IP de tu PC>:8080/api` y corre `npx expo start` (ver el README de la app).

Si el celular no conecta, abre los puertos 8080 y 8081 en el firewall:

| Windows (PowerShell como administrador) | Linux (Fedora) |
|---|---|
| `New-NetFirewallRule -DisplayName "Studia" -Direction Inbound -Protocol TCP -LocalPort 8080,8081 -Action Allow` | `sudo firewall-cmd --add-port=8080/tcp --add-port=8081/tcp` |

## Problemas comunes

| Síntoma | Solución |
|---|---|
| `port is already allocated` | Otro programa usa 8080/8081/8025: cambia `GATEWAY_PORT`, `WEB_PORT` o `MAILPIT_PORT` en `.env` (y `APP_API_URL` si cambias el del Gateway). |
| El seed dice "esperando servicios" varias veces | Normal la primera vez: los micros están aplicando migraciones. |
| Linux con SELinux (Fedora): `Permission denied` en `init-db.sql` | Ya está resuelto con la opción `:z` de los volúmenes; si copiaste el compose a otro lado, mantenla. |
| Windows: errores raros en `init-db.sql` o el seed | La carpeta tiene `.gitattributes` para forzar finales de línea LF; si la copiaste sin Git, conviértelos a LF. |

## Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `GATEWAY_PORT`, `WEB_PORT`, `MAILPIT_PORT` | Puertos publicados en tu PC. |
| `APP_API_URL` | URL del Gateway que usa la app web (queda fija al construir la imagen). |
| `JWT_SECRET`, `INTEGRACION_SECRET`, `INTERNAL_SERVICE_API_KEY`, `MODERACION_INTEGRACION_SECRET`, `EMAIL_VERIFICATION_SECRET` | Secretos compartidos entre micros (mínimo 32 caracteres). Los valores por defecto son solo para desarrollo. |
| `BRANCH_*`, `REPO_URL` | Rama de cada micro que se construye. Tras cambiar código en una rama: `docker compose build --no-cache <servicio>`. |

## Limitación conocida

Reportar a un usuario responde 503: reportes-moderacion valida la sesión con
`GET /sesiones/:id/validacion-reporte`, que agendamiento-sesiones aún no expone.
