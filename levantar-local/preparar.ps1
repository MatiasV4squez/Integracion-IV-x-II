# Windows: descarga (o actualiza) cada rama de backend en levantar-local\.ramas, instala y compila.
# Uso: preparar.cmd   (o: powershell -ExecutionPolicy Bypass -File .\preparar.ps1)
. (Join-Path $PSScriptRoot 'config.ps1')
New-Item -ItemType Directory -Force -Path $RAMAS, $LOGS | Out-Null

Write-Host '== Trayendo las ramas desde GitHub'
Ejecutar 'git fetch' { git -C $REPO fetch origin --quiet }
git -C $REPO worktree prune

foreach ($s in $SERVICIOS_BACKEND) {
  $wt = Join-Path $RAMAS $s.Nombre
  if (Test-Path $wt) {
    Ejecutar "git checkout $($s.Rama)" { git -C $wt checkout --quiet --detach "origin/$($s.Rama)" }
  } else {
    Ejecutar "git worktree $($s.Rama)" { git -C $REPO worktree add --quiet --detach $wt "origin/$($s.Rama)" }
  }
  $ultimo = git -C $wt log -1 --format='%h %s'
  Write-Host ("  {0} <- {1} ({2})" -f $s.Nombre, $s.Rama, $ultimo)
}

Write-Host '== Instalando y compilando (puede tardar varios minutos la primera vez)'
# Cada servicio se compila en su propia ventana oculta de cmd, en paralelo; la salida va a logs\.
$trabajos = @()
foreach ($s in $SERVICIOS_BACKEND) {
  $dir = Dir-De $s.Nombre
  $log = Join-Path $LOGS "preparar-$($s.Nombre).log"
  # Si el package-lock.json de la rama no coincide con su package.json, npm ci falla:
  # en ese caso se usa npm install sin tocar el lockfile.
  $pasos = 'npm ci --no-audit --no-fund || (echo AVISO: package-lock.json desincronizado, se usa npm install && npm install --no-audit --no-fund --no-package-lock)'
  if (Test-Path (Join-Path $dir 'prisma\schema.prisma')) { $pasos = "($pasos) && npx prisma generate" }
  $pasos = "($pasos) && npm run build"
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', "`"$pasos > `"$log`" 2>&1`"" `
    -WorkingDirectory $dir -WindowStyle Hidden -PassThru
  $trabajos += @{ Nombre = $s.Nombre; Proceso = $p; Log = $log }
}

$fallos = 0
foreach ($t in $trabajos) {
  $t.Proceso.WaitForExit()
  $ok = ($t.Proceso.ExitCode -eq 0) -and (Test-Path (Join-Path (Dir-De $t.Nombre) 'dist'))
  if ($ok) {
    $aviso = ''
    if (Select-String -Path $t.Log -Pattern '^AVISO' -Quiet) { $aviso = ' (aviso: lockfile desincronizado en la rama)' }
    Write-Host "  $($t.Nombre) OK$aviso"
  } else {
    Write-Host "  $($t.Nombre) FALLO, revisa levantar-local\logs\preparar-$($t.Nombre).log" -ForegroundColor Red
    $fallos++
  }
}

if (-not (Test-Path (Join-Path $APP_DIR 'node_modules'))) {
  Push-Location $APP_DIR
  try {
    cmd /d /c "npm ci --no-audit --no-fund > `"$LOGS\preparar-app.log`" 2>&1"
    if ($LASTEXITCODE -eq 0) { Write-Host '  app OK' }
    else { Write-Host '  app FALLO, revisa levantar-local\logs\preparar-app.log' -ForegroundColor Red; $fallos++ }
  } finally { Pop-Location }
} else {
  Write-Host '  app OK (dependencias ya instaladas)'
}

if ($fallos -eq 0) { Write-Host "`nListo. Ahora: iniciar.cmd" -ForegroundColor Green }
else { Write-Host "`n$fallos servicio(s) fallaron." -ForegroundColor Red; exit 1 }
