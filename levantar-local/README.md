# Levantar Studia en local (provisional)

Scripts para correr el sistema completo **sin contenedores**: los 4 microservicios, el API Gateway
y la app web, como procesos Node normales sobre un PostgreSQL instalado en tu PC.

```
navegador ──► app (Expo web, :8081) ──► api-gateway (:8080)
                                             │
     ┌─────────────────┬─────────────────────┼──────────────────────┐
     ▼                 ▼                     ▼                      ▼
usuarios-auth    materias-tutores    agendamiento-sesiones    reportes-moderacion
   (:3001)           (:3002)              (:3003)                 (:3004)
     └─────────────────┴──── PostgreSQL (:5432, una base por micro) ┘
```

El código de cada micro **no se copia ni se modifica**: `preparar.sh` saca cada rama de GitHub a
`levantar-local/.ramas/` (con `git worktree`) y la compila ahí.

> Es una solución provisional para desarrollo y demos. Los scripts son de Bash (Linux o macOS;
> en Windows, usar WSL). Los secretos de `config.sh` son solo para uso local.

## Requisitos

- **Node.js 22.12 o superior** y Git.
- **PostgreSQL** (cualquier versión reciente) **con el paquete contrib** (trae la extensión
  `uuid-ossp` que usa agendamiento-sesiones), escuchando en `localhost:5432` con el usuario
  `postgres` y la contraseña `postgres`.

**Fedora:**

```bash
sudo dnf install -y postgresql-server postgresql postgresql-contrib
sudo postgresql-setup --initdb
# Permitir entrar con contraseña por localhost (por defecto Fedora usa "ident")
sudo sed -i -E 's/^(host\s+all\s+all\s+(127\.0\.0\.1\/32|::1\/128)\s+)ident/\1scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres'"
```

**Ubuntu / Debian:**

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres'"
```

¿Otro usuario, contraseña o puerto? Expórtalos antes de correr los scripts:
`PGUSER=yo PGPASSWORD=secreto PGPORT=5433 ./iniciar.sh`.

## Uso

Desde esta carpeta (`levantar-local/`):

| Paso | Comando | Cuándo |
|---|---|---|
| 1. Preparar | `./preparar.sh` | La primera vez, y cuando quieras traer lo último de las ramas |
| 2. Levantar | `./iniciar.sh` | Cada vez (crea las bases y aplica migraciones si faltan) |
| 3. Cuentas de prueba | `node cuentas-prueba.mjs` | La primera vez (se puede repetir, no duplica nada) |
| Detener | `./detener.sh` | Al terminar (PostgreSQL sigue corriendo) |

Después de `./iniciar.sh`:

| Qué | Dónde |
|---|---|
| App web | http://localhost:8081 |
| API Gateway | http://localhost:8080/api/health |
| Logs de cada servicio | `levantar-local/logs/<servicio>.log` |

## Cuentas de prueba

`cuentas-prueba.mjs` las crea con los mismos flujos de la app (registro, verificación, postulación
con certificado y aprobación del administrador).

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `estudiante@alu.uct.cl` | `Estudiante123` |
| Estudiante | `estudiante2@alu.uct.cl` | `Estudiante123` |
| Tutor (Programación III, Sistemas Inteligentes) | `tutor@alu.uct.cl` | `Tutor1234` |
| Tutora (Programación III, Cálculo Intermedio) | `tutor2@alu.uct.cl` | `Tutor1234` |
| Administrador | `admin@alu.uct.cl` | `Admin1234` |

No existe un endpoint para crear administradores: el script asigna ese rol directo en la base.

## Correos de verificación

No se envían correos: el enlace de verificación queda escrito en `logs/usuarios-auth.log`
(línea `Verificación para <correo>: <enlace>`). Ábrelo en el navegador para verificar la cuenta.

## Usar la app desde el celular

La app web usa `http://localhost:8080/api`. Para Expo Go en el celular (misma red Wi-Fi), levanta
con la IP de tu PC: `APP_API_URL=http://192.168.1.10:8080/api ./iniciar.sh`.

## Problemas comunes

| Mensaje | Solución |
|---|---|
| `PostgreSQL no responde en 127.0.0.1:5432` | PostgreSQL no está instalado o no corre: ver *Requisitos*. |
| `Falta la extensión uuid-ossp` | Instala `postgresql-contrib` y reinicia PostgreSQL. |
| `Error: P3009 ... failed migrations` | Una migración falló antes (p. ej. sin contrib). Si la base es de prueba: `psql -h 127.0.0.1 -U postgres -c "drop database agendamiento_sesiones"` y vuelve a `./iniciar.sh`. |
| `el puerto ... ya está ocupado` | Corre `./detener.sh`; si sigue, otro programa usa ese puerto. |
| `<servicio> se cayó` | El script muestra las últimas líneas; el log completo está en `logs/`. |
| `AVISO: package-lock.json desincronizado` | La rama tiene el lockfile desactualizado; se instaló con `npm install`. Conviene corregirlo en la rama. |
