$ErrorActionPreference = 'Stop'

$source = Split-Path -Parent $PSScriptRoot
$target = Join-Path $env:LOCALAPPDATA 'ausentismo-serdan-dev'

Write-Host "Preparando copia local rapida en $target..."
New-Item -ItemType Directory -Force -Path $target | Out-Null

& robocopy $source $target /MIR /XD .git .next node_modules reports work /XF .env.local /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "No se pudo sincronizar el proyecto (robocopy $LASTEXITCODE)." }

# El archivo permanece exclusivamente en este equipo y nunca se imprime.
Copy-Item -LiteralPath (Join-Path $source '.env') -Destination (Join-Path $target '.env') -Force

if (-not (Test-Path (Join-Path $target 'node_modules\next'))) {
  Write-Host 'Instalando dependencias por primera vez...'
  & npm install --no-audit --no-fund --prefix $target
  if ($LASTEXITCODE -ne 0) { throw 'La instalacion de dependencias fallo.' }
}

Write-Host 'Aplicacion disponible en http://localhost:3000/login'
Write-Host 'La terminal debe permanecer abierta mientras usas la aplicacion. Ctrl+C detiene el servidor.'
Set-Location $target
& npm run dev -- --hostname 127.0.0.1 --port 3000
