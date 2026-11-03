# Windows: detiene los servicios que levantó iniciar.ps1. PostgreSQL sigue corriendo.
# Uso: detener.cmd   (o: powershell -ExecutionPolicy Bypass -File .\detener.ps1)
. (Join-Path $PSScriptRoot 'config.ps1')
$ErrorActionPreference = 'Continue'

function Terminar-Arbol([int]$id) {
  # /T: también los procesos hijos (p. ej. los que lanza Expo).
  taskkill /PID $id /T /F *> $null
  return ($LASTEXITCODE -eq 0)
}

foreach ($nombre in 'app', 'api-gateway', 'reportes-moderacion', 'agendamiento-sesiones', 'materias-tutores', 'usuarios-auth') {
  $f = Join-Path $PIDS "$nombre.pid"
  $detenido = $false
  if (Test-Path $f) {
    $detenido = Terminar-Arbol ([int](Get-Content $f))
    Remove-Item $f -Force
  }
  if ($detenido) { Write-Host "detenido $nombre"; continue }

  # Respaldo: proceso node que escucha en el puerto del servicio.
  $puerto = Puerto-De $nombre
  $conexion = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conexion) {
    $proceso = Get-Process -Id $conexion.OwningProcess -ErrorAction SilentlyContinue
    if ($proceso -and $proceso.ProcessName -eq 'node') {
      if (Terminar-Arbol $proceso.Id) { Write-Host "detenido $nombre (por su puerto $puerto)" }
    }
  }
}
