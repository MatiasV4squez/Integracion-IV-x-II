#!/usr/bin/env bash
# Levanta Studia completo como procesos normales: 4 microservicios, API Gateway y la app web (Expo).
# Requiere PostgreSQL en localhost:5432 y haber corrido ./preparar.sh una vez.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
mkdir -p "$LOGS" "$PIDS" "$RAIZ/datos/certificados"

for s in "${SERVICIOS_BACKEND[@]}"; do
  [ -f "$(dir_de "${s%%:*}")/dist/main.js" ] || { echo "Falta compilar ${s%%:*}: corre ./preparar.sh"; exit 1; }
done
psql -d postgres -qc 'select 1' >/dev/null 2>&1 \
  || { echo "PostgreSQL no responde en $PGHOST:$PGPORT con el usuario $PGUSER (ver README.md)"; exit 1; }

echo "== Bases de datos"
for db in usuarios_auth materias agendamiento_sesiones reportes; do
  if ! psql -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1; then
    psql -d postgres -qc "create database $db" && echo "  creada $db"
  fi
done
psql -d postgres -tAc "select 1 from pg_available_extensions where name='uuid-ossp'" | grep -q 1 \
  || { echo "Falta la extensión uuid-ossp de PostgreSQL (paquete postgresql-contrib, ver README.md)"; exit 1; }

echo "== Migraciones"
migrar() { # migrar <servicio> <base>
  (cd "$(dir_de "$1")" && DATABASE_URL="$2" npx prisma migrate deploy >"$LOGS/migracion-$1.log" 2>&1) \
    && echo "  $1 OK" || { echo "  $1 FALLÓ:"; tail -15 "$LOGS/migracion-$1.log"; exit 1; }
}
migrar usuarios-auth "$DB_BASE/usuarios_auth?schema=public"
migrar materias-tutores "$DB_BASE/materias"
migrar agendamiento-sesiones "$DB_BASE/agendamiento_sesiones"
migrar reportes-moderacion "$DB_BASE/reportes"
(cd "$(dir_de materias-tutores)" && DATABASE_URL="$DB_BASE/materias" npx prisma db seed >/dev/null 2>&1) \
  && echo "  materias iniciales cargadas"

corriendo() { [ -f "$PIDS/$1.pid" ] && kill -0 "$(cat "$PIDS/$1.pid")" 2>/dev/null; }

arrancar() { # arrancar <servicio> <comando...>  (variables de entorno con env, delante del comando)
  local nombre=$1; shift
  if corriendo "$nombre"; then echo "  $nombre ya está corriendo"; return; fi
  if (exec 3<>"/dev/tcp/127.0.0.1/$(puerto_de "$nombre")") 2>/dev/null; then
    echo "  $nombre: el puerto $(puerto_de "$nombre") ya está ocupado por otro proceso (prueba ./detener.sh)"; exit 1
  fi
  cd "$(dir_de "$nombre")"
  # setsid: cada servicio en su propio grupo de procesos, para detenerlo completo con detener.sh.
  setsid "$@" >"$LOGS/$nombre.log" 2>&1 < /dev/null &
  echo $! >"$PIDS/$nombre.pid"
  cd "$RAIZ"
  echo "  $nombre iniciado"
}

U=$(puerto_de usuarios-auth); M=$(puerto_de materias-tutores); S=$(puerto_de agendamiento-sesiones)
R=$(puerto_de reportes-moderacion); G=$(puerto_de api-gateway)

echo "== Servicios"
arrancar usuarios-auth env NODE_ENV=development PORT="$U" \
  DATABASE_URL="$DB_BASE/usuarios_auth?schema=public" \
  JWT_ACCESS_TTL_SECONDS=1800 JWT_IDLE_TIMEOUT_SECONDS=1800 \
  SMTP_DISABLED=true SMTP_HOST=localhost SMTP_PORT=1025 SMTP_SECURE=false SMTP_USER= SMTP_PASSWORD= \
  SMTP_FROM="Studia <no-reply@studia.local>" \
  EMAIL_VERIFICATION_URL="http://localhost:$PUERTO_APP/verificar-cuenta" \
  EMAIL_VERIFICATION_SECRET="$EMAIL_VERIFICATION_SECRET" EMAIL_VERIFICATION_TTL_MINUTES=30 \
  node dist/main.js

arrancar materias-tutores env PORT="$M" DATABASE_URL="$DB_BASE/materias" \
  USUARIOS_AUTH_ASIGNAR_TUTOR_URL="http://localhost:$U/internal/usuarios/roles" \
  CERTIFICADOS_DIR="$RAIZ/datos/certificados" \
  node dist/main.js

arrancar agendamiento-sesiones env PORT="$S" DATABASE_URL="$DB_BASE/agendamiento_sesiones" \
  MATERIAS_TUTORES_URL="http://localhost:$M" REPORTES_MODERACION_URL="http://localhost:$R" \
  node dist/main.js

arrancar reportes-moderacion env PORT="$R" DATABASE_URL="$DB_BASE/reportes" \
  SESIONES_SERVICE_URL="http://localhost:$S" USUARIOS_AUTH_URL="http://localhost:$U" \
  node dist/main.js

arrancar api-gateway env PORT="$G" \
  USUARIOS_AUTH_URL="http://localhost:$U" MATERIAS_TUTORES_URL="http://localhost:$M" \
  AGENDAMIENTO_SESIONES_URL="http://localhost:$S" REPORTES_MODERACION_URL="http://localhost:$R" \
  CORS_ORIGIN="*" HTTP_TIMEOUT_MS=10000 \
  node dist/main.js

# Para usar la app desde el celular: APP_API_URL=http://<IP-de-tu-PC>:8080/api ./iniciar.sh
arrancar app env CI=1 EXPO_PUBLIC_API_URL="${APP_API_URL:-http://localhost:$G/api}" \
  npx expo start --web --port "$PUERTO_APP"

echo "== Esperando a que respondan"
for nombre in usuarios-auth materias-tutores agendamiento-sesiones reportes-moderacion api-gateway app; do
  puerto=$(puerto_de "$nombre")
  for _ in $(seq 1 120); do
    curl -s -o /dev/null "http://localhost:$puerto/" && break
    corriendo "$nombre" || { echo "  $nombre se cayó; últimas líneas de logs/$nombre.log:"; tail -15 "$LOGS/$nombre.log"; exit 1; }
    sleep 1
  done
  curl -s -o /dev/null "http://localhost:$puerto/" && echo "  $nombre OK (:$puerto)" || echo "  $nombre no responde (:$puerto)"
done

cat <<EOF

Studia corriendo:
  App web        http://localhost:$PUERTO_APP
  API Gateway    http://localhost:$G/api/health
Cuentas de prueba (la primera vez):  node cuentas-prueba.mjs
Detener:                             ./detener.sh
EOF
