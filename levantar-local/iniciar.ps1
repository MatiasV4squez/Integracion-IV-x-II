# Windows: levanta los 4 microservicios, el API Gateway y la app web (Expo) como procesos en segundo plano.
# Requiere PostgreSQL en localhost:5432 y haber corrido preparar.cmd una vez.
# Uso: iniciar.cmd   (o: powershell -ExecutionPolicy Bypass -File .\iniciar.ps1)
. (Join-Path $PSScriptRoot 'config.ps1')
New-Item -ItemType Directory -Force -Path $LOGS, $PIDS, (Join-Path $RAIZ 'datos\certificados') | Out-Null

foreach ($s in $SERVICIOS_BACKEND) {
  if (-not (Test-Path (Join-Path (Dir-De $s.Nombre) 'dist\main.js'))) {
    Write-Host "Falta compilar $($s.Nombre): corre preparar.cmd" -ForegroundColor Red; exit 1
  }
}

$PSQL = Buscar-Psql
if (-not $PSQL) {
  Write-Host 'No se encontró psql. Instala PostgreSQL (ver README.md) o agrega su carpeta bin al PATH.' -ForegroundColor Red; exit 1
}
$env:PSQL = $PSQL  # lo usa cuentas-prueba.mjs

function Sql([string]$base, [string]$consulta) {
  # En PowerShell 5.1, con 'Stop', cualquier línea en stderr de un programa nativo corta el script.
  $ErrorActionPreference = 'Continue'
  $r = & $PSQL -d $base -tAc $consulta 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql: $r" }
  return "$r".Trim()
}

try { Sql 'postgres' 'select 1' | Out-Null } catch {
  Write-Host "PostgreSQL no responde en $($env:PGHOST):$($env:PGPORT) con el usuario $($env:PGUSER) (ver README.md)" -ForegroundColor Red
  Write-Host $_ ; exit 1
}

Write-Host '== Bases de datos'
foreach ($db in 'usuarios_auth', 'materias', 'agendamiento_sesiones', 'reportes') {
  if ((Sql 'postgres' "select 1 from pg_database where datname='$db'") -ne '1') {
    Sql 'postgres' "create database $db" | Out-Null
    Write-Host "  creada $db"
  }
}
if ((Sql 'postgres' "select 1 from pg_available_extensions where name='uuid-ossp'") -ne '1') {
  Write-Host 'Falta la extensión uuid-ossp de PostgreSQL (ver README.md)' -ForegroundColor Red; exit 1
}

Write-Host '== Migraciones'
function Migrar($nombre, $url) {
  $log = Join-Path $LOGS "migracion-$nombre.log"
  Push-Location (Dir-De $nombre)
  try {
    $env:DATABASE_URL = $url
    cmd /d /c "npx prisma migrate deploy > `"$log`" 2>&1"
    $codigo = $LASTEXITCODE
  } finally { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue; Pop-Location }
  if ($codigo -ne 0) {
    Write-Host "  $nombre FALLO:" -ForegroundColor Red; Get-Content $log -Tail 15; exit 1
  }
  Write-Host "  $nombre OK"
}
Migrar 'usuarios-auth' "$DB_BASE/usuarios_auth?schema=public"
Migrar 'materias-tutores' "$DB_BASE/materias"
Migrar 'agendamiento-sesiones' "$DB_BASE/agendamiento_sesiones"
Migrar 'reportes-moderacion' "$DB_BASE/reportes"

Push-Location (Dir-De 'materias-tutores')
try {
  $env:DATABASE_URL = "$DB_BASE/materias"
  cmd /d /c "npx prisma db seed > nul 2>&1"
  if ($LASTEXITCODE -eq 0) { Write-Host '  materias iniciales cargadas' }
} finally { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue; Pop-Location }

function Corriendo($nombre) {
  $f = Join-Path $PIDS "$nombre.pid"
  if (-not (Test-Path $f)) { return $false }
  return [bool](Get-Process -Id ([int](Get-Content $f)) -ErrorAction SilentlyContinue)
}

# Arranca un servicio en segundo plano con sus variables de entorno; la salida va a logs\<nombre>.log.
function Arrancar($nombre, [hashtable]$variables, [string[]]$argumentos) {
  if (Corriendo $nombre) { Write-Host "  $nombre ya está corriendo"; return }
  $puerto = Puerto-De $nombre
  if (Puerto-Abierto $puerto) {
    Write-Host "  ${nombre}: el puerto $puerto ya está ocupado por otro proceso (prueba detener.cmd)" -ForegroundColor Red; exit 1
  }
  $anteriores = @{}
  foreach ($k in $variables.Keys) { $anteriores[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $variables[$k]) }
  try {
    $p = Start-Process -FilePath 'node' -ArgumentList $argumentos -WorkingDirectory (Dir-De $nombre) `
      -RedirectStandardOutput (Join-Path $LOGS "$nombre.log") -RedirectStandardError (Join-Path $LOGS "$nombre.error.log") `
      -WindowStyle Hidden -PassThru
  } finally {
    foreach ($k in $variables.Keys) { [Environment]::SetEnvironmentVariable($k, $anteriores[$k]) }
  }
  Set-Content -Path (Join-Path $PIDS "$nombre.pid") -Value $p.Id
  Write-Host "  $nombre iniciado"
}

$U = Puerto-De 'usuarios-auth'; $M = Puerto-De 'materias-tutores'; $S = Puerto-De 'agendamiento-sesiones'
$R = Puerto-De 'reportes-moderacion'; $G = Puerto-De 'api-gateway'

Write-Host '== Servicios'
Arrancar 'usuarios-auth' @{
  NODE_ENV = 'development'; PORT = "$U"; DATABASE_URL = "$DB_BASE/usuarios_auth?schema=public"
  JWT_ACCESS_TTL_SECONDS = '1800'; JWT_IDLE_TIMEOUT_SECONDS = '1800'
  SMTP_DISABLED = 'true'; SMTP_HOST = 'localhost'; SMTP_PORT = '1025'; SMTP_SECURE = 'false'
  SMTP_FROM = 'Studia <no-reply@studia.local>'
  EMAIL_VERIFICATION_URL = "http://localhost:$PUERTO_APP/verificar-cuenta"
  EMAIL_VERIFICATION_SECRET = $EMAIL_VERIFICATION_SECRET; EMAIL_VERIFICATION_TTL_MINUTES = '30'
} @('dist/main.js')

Arrancar 'materias-tutores' @{
  PORT = "$M"; DATABASE_URL = "$DB_BASE/materias"
  USUARIOS_AUTH_ASIGNAR_TUTOR_URL = "http://localhost:$U/internal/usuarios/roles"
  CERTIFICADOS_DIR = (Join-Path $RAIZ 'datos\certificados')
} @('dist/main.js')

Arrancar 'agendamiento-sesiones' @{
  PORT = "$S"; DATABASE_URL = "$DB_BASE/agendamiento_sesiones"
  MATERIAS_TUTORES_URL = "http://localhost:$M"; REPORTES_MODERACION_URL = "http://localhost:$R"
} @('dist/main.js')

Arrancar 'reportes-moderacion' @{
  PORT = "$R"; DATABASE_URL = "$DB_BASE/reportes"
  SESIONES_SERVICE_URL = "http://localhost:$S"; USUARIOS_AUTH_URL = "http://localhost:$U"
} @('dist/main.js')

Arrancar 'api-gateway' @{
  PORT = "$G"
  USUARIOS_AUTH_URL = "http://localhost:$U"; MATERIAS_TUTORES_URL = "http://localhost:$M"
  AGENDAMIENTO_SESIONES_URL = "http://localhost:$S"; REPORTES_MODERACION_URL = "http://localhost:$R"
  CORS_ORIGIN = '*'; HTTP_TIMEOUT_MS = '10000'
} @('dist/main.js')

# Para usar la app desde el celular:  $env:APP_API_URL = "http://<IP-de-tu-PC>:8080/api"; .\iniciar.cmd
$apiUrl = Valor 'APP_API_URL' "http://localhost:$G/api"
Arrancar 'app' @{ CI = '1'; EXPO_PUBLIC_API_URL = $apiUrl } @('node_modules/expo/bin/cli', 'start', '--web', '--port', "$PUERTO_APP")

Write-Host '== Esperando a que respondan'
foreach ($nombre in 'usuarios-auth', 'materias-tutores', 'agendamiento-sesiones', 'reportes-moderacion', 'api-gateway', 'app') {
  $puerto = Puerto-De $nombre
  for ($i = 0; $i -lt 120; $i++) {
    if (Puerto-Abierto $puerto) { break }
    if (-not (Corriendo $nombre)) {
      Write-Host "  $nombre se cayó; últimas líneas de logs\$nombre.error.log y logs\$nombre.log:" -ForegroundColor Red
      Get-Content (Join-Path $LOGS "$nombre.error.log") -Tail 10 -ErrorAction SilentlyContinue
      Get-Content (Join-Path $LOGS "$nombre.log") -Tail 10 -ErrorAction SilentlyContinue
      exit 1
    }
    Start-Sleep -Seconds 1
  }
  if (Puerto-Abierto $puerto) { Write-Host "  $nombre OK (:$puerto)" } else { Write-Host "  $nombre no responde (:$puerto)" -ForegroundColor Yellow }
}

Write-Host ''
Write-Host 'Studia corriendo:' -ForegroundColor Green
Write-Host "  App web        http://localhost:$PUERTO_APP"
Write-Host "  API Gateway    http://localhost:$G/api/health"
Write-Host 'Cuentas de prueba (la primera vez):  cuentas-prueba.cmd'
Write-Host 'Detener:                             detener.cmd'
