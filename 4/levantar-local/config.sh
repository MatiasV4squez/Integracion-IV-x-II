# Configuración compartida (la cargan preparar.sh, iniciar.sh y detener.sh).
# Cualquier valor se puede cambiar exportando la variable antes de correr el script.
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$RAIZ/.." && pwd)"
RAMAS="$RAIZ/.ramas"            # una copia (git worktree) de cada rama de backend
APP_DIR="$REPO/proyect-app-studia"
LOGS="$RAIZ/logs"
PIDS="$RAIZ/.run"

# servicio:rama:puerto
SERVICIOS_BACKEND=(
  "usuarios-auth:feature/micro_usuarios_auth:3001"
  "materias-tutores:feature/micro_materias_tutores:3002"
  "agendamiento-sesiones:feature/agendamiento_sesiones:3003"
  "reportes-moderacion:feature/micro_reportes_y_moderacion:3004"
  "api-gateway:apigateway:8080"
)
PUERTO_APP=${PUERTO_APP:-8081}

# PostgreSQL local
export PGHOST=${PGHOST:-127.0.0.1} PGPORT=${PGPORT:-5432}
export PGUSER=${PGUSER:-postgres} PGPASSWORD=${PGPASSWORD:-postgres}
DB_BASE="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT"

# Secretos SOLO para desarrollo local (mínimo 32 caracteres cada uno)
export JWT_SECRET=${JWT_SECRET:-studia_local_jwt_secreto_de_al_menos_32_bytes_000}
export INTEGRACION_SECRET=${INTEGRACION_SECRET:-studia_local_integracion_de_al_menos_32_bytes_00}
export INTERNAL_SERVICE_API_KEY=${INTERNAL_SERVICE_API_KEY:-studia_local_clave_interna_de_al_menos_32_bytes_0}
export MODERACION_INTEGRACION_SECRET=${MODERACION_INTEGRACION_SECRET:-studia_local_moderacion_de_al_menos_32_bytes_00}
EMAIL_VERIFICATION_SECRET=${EMAIL_VERIFICATION_SECRET:-studia_local_verificacion_de_al_menos_32_bytes_0}

puerto_de() { # puerto_de <servicio>
  local s
  for s in "${SERVICIOS_BACKEND[@]}"; do [ "${s%%:*}" = "$1" ] && { echo "${s##*:}"; return; }; done
  [ "$1" = app ] && echo "$PUERTO_APP"
}
dir_de() { # carpeta del código de un servicio
  if [ "$1" = app ]; then echo "$APP_DIR"; else echo "$RAMAS/$1/$1"; fi
}
