#!/usr/bin/env bash
# Descarga (o actualiza) cada rama de backend en levantar-local/.ramas/, instala dependencias y compila.
# También instala las dependencias de la app. Se corre la primera vez y cada vez que quieras traer
# lo último de las ramas. No modifica las ramas: solo trabaja sobre copias locales.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
mkdir -p "$RAMAS"

echo "== Trayendo las ramas desde GitHub"
git -C "$REPO" fetch origin --quiet
git -C "$REPO" worktree prune

for s in "${SERVICIOS_BACKEND[@]}"; do
  nombre=${s%%:*}; resto=${s#*:}; rama=${resto%%:*}
  wt="$RAMAS/$nombre"
  if [ -d "$wt" ]; then
    git -C "$wt" checkout --quiet --detach "origin/$rama"
  else
    git -C "$REPO" worktree add --quiet --detach "$wt" "origin/$rama"
  fi
  echo "  $nombre <- $rama ($(git -C "$wt" log -1 --format='%h %s' | cut -c1-60))"
done

echo "== Instalando y compilando (puede tardar unos minutos la primera vez)"
compilar() {
  local nombre=$1 dir log
  dir="$(dir_de "$nombre")"; log="$LOGS/preparar-$nombre.log"
  (
    cd "$dir"
    # Si el package-lock.json de la rama no coincide con su package.json, npm ci falla:
    # en ese caso se usa npm install sin tocar el lockfile.
    npm ci --no-audit --no-fund || {
      echo "AVISO: package-lock.json desincronizado; se usa npm install"
      npm install --no-audit --no-fund --no-package-lock
    }
    if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
    npm run build
  ) >"$log" 2>&1 \
    && echo "  $nombre OK$(grep -q '^AVISO' "$log" && echo ' (aviso: lockfile desincronizado en la rama)')" \
    || { echo "  $nombre FALLÓ, revisa ${log#"$REPO"/}"; return 1; }
}
mkdir -p "$LOGS"
fallos=0
for s in "${SERVICIOS_BACKEND[@]}"; do compilar "${s%%:*}" & done
for _ in "${SERVICIOS_BACKEND[@]}"; do wait -n || fallos=$((fallos + 1)); done

if [ ! -d "$APP_DIR/node_modules" ]; then
  (cd "$APP_DIR" && npm ci --no-audit --no-fund >"$LOGS/preparar-app.log" 2>&1) \
    && echo "  app OK" || { echo "  app FALLÓ, revisa levantar-local/logs/preparar-app.log"; fallos=$((fallos + 1)); }
else
  echo "  app OK (dependencias ya instaladas)"
fi

[ "$fallos" -eq 0 ] && echo -e "\nListo. Ahora: ./iniciar.sh" || { echo -e "\n$fallos servicio(s) fallaron."; exit 1; }
