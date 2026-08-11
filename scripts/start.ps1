# Start Dink local stack: optional Docker Mongo + Meteor API + Next.js web
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"
$LogDir = Join-Path $RunDir "logs"

New-Item -ItemType Directory -Force -Path $RunDir, $LogDir | Out-Null

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message
  Write-Host $line
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $parts = $line.Split("=", 2)
    $map[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
  }
  return $map
}

function Test-PortOpen([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(300)
    if ($ok -and $client.Connected) {
      $client.Close()
      return $true
    }
    $client.Close()
    return $false
  } catch {
    return $false
  }
}

function Wait-Http([string]$Url, [int]$TimeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { return $true }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  return $false
}

function Start-LoggedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$CommandLine,
    [hashtable]$EnvVars
  )

  $stdout = Join-Path $LogDir "$Name.out.log"
  $stderr = Join-Path $LogDir "$Name.err.log"
  $pidFile = Join-Path $RunDir "$Name.pid"

  if (Test-Path $pidFile) {
    $existing = Get-Content $pidFile | Select-Object -First 1
    if ($existing -and (Get-Process -Id ([int]$existing) -ErrorAction SilentlyContinue)) {
      Write-Log "$Name already running (pid $existing)"
      return
    }
  }

  if ($EnvVars.ContainsKey("__UNSET__")) {
    foreach ($unsetKey in $EnvVars["__UNSET__"]) {
      Remove-Item -Path "Env:$unsetKey" -ErrorAction SilentlyContinue
    }
  }
  foreach ($key in $EnvVars.Keys) {
    if ($key -eq "__UNSET__") { continue }
    Set-Item -Path "Env:$key" -Value ([string]$EnvVars[$key])
  }

  Write-Log "starting $Name..."
  # Use cmd.exe so .cmd/.bat shims (meteor, pnpm) work with redirected IO
  $proc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", $CommandLine) `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru `
    -WindowStyle Hidden

  Set-Content -Path $pidFile -Value $proc.Id
  Write-Log "$Name started (pid $($proc.Id)) logs: $stdout"
}

# Ensure tools on PATH for this session
$env:PATH = @(
  "$env:LOCALAPPDATA\.meteor",
  "C:\Program Files\nodejs",
  "$env:APPDATA\npm",
  [System.Environment]::GetEnvironmentVariable("Path", "Machine"),
  [System.Environment]::GetEnvironmentVariable("Path", "User")
) -join ";"

$dotenv = Get-DotEnv (Join-Path $Root ".env")
$mongoUrl = if ($dotenv["MONGO_URL"]) { $dotenv["MONGO_URL"] } else { $null }
$rootUrl = if ($dotenv["ROOT_URL"]) { $dotenv["ROOT_URL"] } else { "http://localhost:3001" }
$seed = if ($dotenv["SEED_ON_STARTUP"]) { $dotenv["SEED_ON_STARTUP"] } else { "true" }
$cors = if ($dotenv["CORS_ORIGINS"]) { $dotenv["CORS_ORIGINS"] } else { "http://localhost:3000,http://127.0.0.1:3000" }

Write-Log "Dink start from $Root"

# 1) Mongo via Docker when available
$useDockerMongo = $false
if (Test-Command "docker") {
  try {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      $useDockerMongo = $true
    }
  } catch {
    $useDockerMongo = $false
  }
}

if ($useDockerMongo) {
  Write-Log "starting Docker Mongo..."
  Push-Location $Root
  try {
    docker compose up -d mongo
    if (-not $mongoUrl) {
      $mongoUrl = "mongodb://localhost:27017/dink?replicaSet=rs0"
    }
    Write-Log "Docker Mongo requested (MONGO_URL=$mongoUrl)"
  } finally {
    Pop-Location
  }
} else {
  Write-Log "Docker not available - Meteor will use its local Mongo (omit MONGO_URL)"
  $mongoUrl = $null
}

# 2) Meteor API
if (Test-PortOpen 3001) {
  Write-Log "port 3001 already in use - skipping Meteor start"
} else {
  if (-not (Test-Command "meteor")) {
    throw "meteor not found on PATH. Install Meteor first."
  }
  $apiEnv = @{
    ROOT_URL = $rootUrl
    SEED_ON_STARTUP = $seed
    CORS_ORIGINS = $cors
  }
  if ($mongoUrl) {
    $apiEnv["MONGO_URL"] = $mongoUrl
  } else {
    # Ensure leftover shell MONGO_URL does not force a missing Docker DB
    $apiEnv["__UNSET__"] = @("MONGO_URL")
  }

  Start-LoggedProcess -Name "api" `
    -WorkingDirectory (Join-Path $Root "apps\api") `
    -CommandLine "meteor run --port 3001 --settings settings.json" `
    -EnvVars $apiEnv
}

# 3) Next.js web
if (Test-PortOpen 3000) {
  Write-Log "port 3000 already in use - skipping Next start"
} else {
  if (-not (Test-Command "pnpm")) {
    throw "pnpm not found on PATH. Install pnpm first."
  }
  Start-LoggedProcess -Name "web" `
    -WorkingDirectory $Root `
    -CommandLine "pnpm --filter web dev" `
    -EnvVars @{}
}

Write-Log "waiting for API health..."
if (Wait-Http "http://localhost:3001/api/v1/health" 120) {
  Write-Log "API ready: http://localhost:3001"
} else {
  Write-Log "API not healthy yet - check .run/logs/api.*.log"
}

Write-Log "waiting for web..."
if (Wait-Http "http://localhost:3000" 90) {
  Write-Log "Web ready: http://localhost:3000"
} else {
  Write-Log "Web not ready yet - check .run/logs/web.*.log"
}

Write-Log "done. Use: pnpm down"
Write-Log 'seed owner: owner@dink.local / Owner123!'
Write-Log 'seed admin: admin@dink.local / Admin123!'
