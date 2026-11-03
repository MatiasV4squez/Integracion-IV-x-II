#!/usr/bin/env bash
# Detiene los servicios que levantó iniciar.sh. PostgreSQL sigue corriendo.
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

for nombre in app api-gateway reportes-moderacion agendamiento-sesiones materias-tutores usuarios-auth; do
  pidf="$PIDS/$nombre.pid"
  if [ -f "$pidf" ] && kill -- -"$(cat "$pidf")" 2>/dev/null; then
    echo "detenido $nombre"
  else
    # Respaldo: proceso node que escucha en el puerto del servicio.
    puerto=$(puerto_de "$nombre")
    pid=$(ss -ltnpH "sport = :$puerto" 2>/dev/null | grep -oP '"node",pid=\K[0-9]+' | head -n 1)
    if [ -n "$pid" ]; then
      kill -- -"$(ps -o pgid= -p "$pid" | tr -d ' ')" 2>/dev/null || kill "$pid"
      echo "detenido $nombre (por su puerto $puerto)"
    fi
  fi
  rm -f "$pidf"
done
