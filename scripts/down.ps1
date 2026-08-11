# Stop Dink local stack started by scripts/start.ps1
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message
  Write-Host $line
}

function Stop-PidFile([string]$Name) {
  $pidFile = Join-Path $RunDir "$Name.pid"
  if (-not (Test-Path $pidFile)) {
    Write-Log "no pid file for $Name"
    return
  }
  $raw = (Get-Content $pidFile | Select-Object -First 1)
  if (-not $raw) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return
  }
  $procId = [int]$raw
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Log "stopping $Name (pid $procId) and children..."
    try {
      & taskkill /PID $procId /T /F 1>$null 2>$null
    } catch {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  } else {
    Write-Log "$Name pid $procId already stopped"
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

function Stop-PortListeners([int]$Port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      $procId = $c.OwningProcess
      if ($procId -and $procId -ne 0) {
        Write-Log "freeing port $Port (pid $procId)"
        & taskkill /PID $procId /T /F 1>$null 2>$null
      }
    }
  } catch {
    $lines = netstat -ano | Select-String ":$Port\s+.*LISTENING"
    foreach ($line in $lines) {
      $parts = ($line.ToString() -split "\s+") | Where-Object { $_ }
      $procId = $parts[-1]
      if ($procId -match "^\d+$") {
        Write-Log "freeing port $Port (pid $procId)"
        & taskkill /PID $procId /T /F 1>$null 2>$null
      }
    }
  }
}

Write-Log "Dink down from $Root"

Stop-PidFile "web"
Stop-PidFile "api"

Stop-PortListeners 3000
Stop-PortListeners 3001

if (Get-Command docker -ErrorAction SilentlyContinue) {
  try {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Log "stopping Docker Compose (mongo)..."
      Push-Location $Root
      try {
        docker compose down
      } finally {
        Pop-Location
      }
    }
  } catch {
    Write-Log "Docker skip: $($_.Exception.Message)"
  }
} else {
  Write-Log "Docker not available - skipped compose down"
}

Write-Log "done"
