# Configuración compartida para Windows (la cargan preparar.ps1, iniciar.ps1 y detener.ps1).
# Compatible con Windows PowerShell 5.1 y PowerShell 7.
# Cualquier valor se puede cambiar definiendo la variable de entorno antes de correr el script,
# p. ej.:  $env:PGPASSWORD = "mi_clave"; .\iniciar.cmd

$ErrorActionPreference = 'Stop'

$RAIZ    = $PSScriptRoot
$REPO    = (Resolve-Path (Join-Path $RAIZ '..')).Path
$RAMAS   = Join-Path $RAIZ '.ramas'
$APP_DIR = Join-Path $REPO 'proyect-app-studia'
$LOGS    = Join-Path $RAIZ 'logs'
$PIDS    = Join-Path $RAIZ '.run'

$SERVICIOS_BACKEND = @(
  @{ Nombre = 'usuarios-auth';         Rama = 'feature/micro_usuarios_auth';         Puerto = 3001 },
  @{ Nombre = 'materias-tutores';      Rama = 'feature/micro_materias_tutores';      Puerto = 3002 },
  @{ Nombre = 'agendamiento-sesiones'; Rama = 'feature/agendamiento_sesiones';       Puerto = 3003 },
  @{ Nombre = 'reportes-moderacion';   Rama = 'feature/micro_reportes_y_moderacion'; Puerto = 3004 },
  @{ Nombre = 'api-gateway';           Rama = 'apigateway';                          Puerto = 8080 }
)
$PUERTO_APP = 8081
if ($env:PUERTO_APP) { $PUERTO_APP = [int]$env:PUERTO_APP }

function Valor($nombre, $porDefecto) {
  $v = [Environment]::GetEnvironmentVariable($nombre)
  if ($v) { return $v } else { return $porDefecto }
}

# PostgreSQL local
$env:PGHOST     = Valor 'PGHOST' '127.0.0.1'
$env:PGPORT     = Valor 'PGPORT' '5432'
$env:PGUSER     = Valor 'PGUSER' 'postgres'
$env:PGPASSWORD = Valor 'PGPASSWORD' 'postgres'
$DB_BASE = "postgresql://$($env:PGUSER):$($env:PGPASSWORD)@$($env:PGHOST):$($env:PGPORT)"

# Secretos SOLO para desarrollo local (mínimo 32 caracteres cada uno)
$env:JWT_SECRET                    = Valor 'JWT_SECRET' 'studia_local_jwt_secreto_de_al_menos_32_bytes_000'
$env:INTEGRACION_SECRET            = Valor 'INTEGRACION_SECRET' 'studia_local_integracion_de_al_menos_32_bytes_00'
$env:INTERNAL_SERVICE_API_KEY      = Valor 'INTERNAL_SERVICE_API_KEY' 'studia_local_clave_interna_de_al_menos_32_bytes_0'
$env:MODERACION_INTEGRACION_SECRET = Valor 'MODERACION_INTEGRACION_SECRET' 'studia_local_moderacion_de_al_menos_32_bytes_00'
$EMAIL_VERIFICATION_SECRET         = Valor 'EMAIL_VERIFICATION_SECRET' 'studia_local_verificacion_de_al_menos_32_bytes_0'

function Puerto-De($nombre) {
  if ($nombre -eq 'app') { return $PUERTO_APP }
  return ($SERVICIOS_BACKEND | Where-Object { $_.Nombre -eq $nombre }).Puerto
}

function Dir-De($nombre) {
  if ($nombre -eq 'app') { return $APP_DIR }
  return (Join-Path (Join-Path $RAMAS $nombre) $nombre)
}

# psql: primero el PATH; si no, la instalación típica de PostgreSQL para Windows.
function Buscar-Psql {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidatos = Get-ChildItem -Path "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Directory.Parent.Name -replace '\D', '') } -Descending
  if ($candidatos) { return $candidatos[0].FullName }
  return $null
}

# true si algo escucha en el puerto local.
function Puerto-Abierto([int]$puerto) {
  $cliente = New-Object System.Net.Sockets.TcpClient
  try {
    $intento = $cliente.BeginConnect('127.0.0.1', $puerto, $null, $null)
    if (-not $intento.AsyncWaitHandle.WaitOne(500)) { return $false }
    $cliente.EndConnect($intento)
    return $true
  } catch { return $false } finally { $cliente.Close() }
}

# Ejecuta un comando nativo y falla si termina con error (PowerShell 5.1 no lo hace solo).
function Ejecutar([string]$descripcion, [scriptblock]$bloque) {
  & $bloque
  if ($LASTEXITCODE -ne 0) { throw "$descripcion falló (código $LASTEXITCODE)" }
}
