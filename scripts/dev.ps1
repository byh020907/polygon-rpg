param(
  [ValidateSet('start', 'url', 'stop-tunnel')]
  [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$polygonRpgRoot = Split-Path -Parent $PSScriptRoot
$polygonRpgOriginUrl = 'http://127.0.0.1:5173'
$polygonRpgStateDirectory = Join-Path $env:LOCALAPPDATA 'PolygonRpg\dev-tunnel'
$polygonRpgPidPath = Join-Path $polygonRpgStateDirectory 'cloudflared.pid'
$polygonRpgOutputPath = Join-Path $polygonRpgStateDirectory 'cloudflared.stdout.log'
$polygonRpgErrorPath = Join-Path $polygonRpgStateDirectory 'cloudflared.stderr.log'

function Get-PolygonRpgTunnelProcess {
  if (-not (Test-Path -LiteralPath $polygonRpgPidPath)) {
    return $null
  }

  $polygonRpgProcessId = Get-Content -Raw -LiteralPath $polygonRpgPidPath
  if ($polygonRpgProcessId -notmatch '^\d+$') {
    return $null
  }

  $polygonRpgProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $polygonRpgProcessId" -ErrorAction SilentlyContinue
  if (
    $null -eq $polygonRpgProcess -or
    $polygonRpgProcess.Name -ne 'cloudflared.exe' -or
    $polygonRpgProcess.CommandLine -notmatch 'tunnel --url http://127\.0\.0\.1:5173'
  ) {
    return $null
  }

  return $polygonRpgProcess
}

function Get-PolygonRpgTunnelUrl {
  foreach ($polygonRpgLogPath in @($polygonRpgOutputPath, $polygonRpgErrorPath)) {
    if (-not (Test-Path -LiteralPath $polygonRpgLogPath)) {
      continue
    }

    $polygonRpgMatch = Select-String -Path $polygonRpgLogPath -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches |
      Select-Object -Last 1
    if ($null -ne $polygonRpgMatch) {
      return $polygonRpgMatch.Matches[-1].Value
    }
  }

  return $null
}

function Write-PolygonRpgTunnelLink {
  param([string]$TunnelUrl)

  $polygonRpgEscape = [char]27
  $polygonRpgBell = [char]7
  $polygonRpgLink = "${polygonRpgEscape}]8;;${TunnelUrl}${polygonRpgBell}모바일 검증 열기${polygonRpgEscape}]8;;${polygonRpgBell}"

  Write-Host "Mobile verification: $polygonRpgLink"
  Write-Host "URL: $TunnelUrl"
}

function Remove-PolygonRpgTunnelState {
  foreach ($polygonRpgStatePath in @($polygonRpgPidPath, $polygonRpgOutputPath, $polygonRpgErrorPath)) {
    if (Test-Path -LiteralPath $polygonRpgStatePath) {
      Remove-Item -LiteralPath $polygonRpgStatePath -Force
    }
  }
}

function Wait-ForPolygonRpgTunnelUrl {
  param([System.Diagnostics.Process]$TunnelProcess)

  $polygonRpgDeadline = [DateTime]::UtcNow.AddSeconds(20)
  while ([DateTime]::UtcNow -lt $polygonRpgDeadline) {
    if ($TunnelProcess.HasExited) {
      $polygonRpgRecentErrors = if (Test-Path -LiteralPath $polygonRpgErrorPath) {
        (Get-Content -LiteralPath $polygonRpgErrorPath -Tail 12) -join [Environment]::NewLine
      } else {
        'cloudflared exited without a log.'
      }
      throw "cloudflared stopped before creating a URL.$([Environment]::NewLine)$polygonRpgRecentErrors"
    }

    $polygonRpgTunnelUrl = Get-PolygonRpgTunnelUrl
    if ($null -ne $polygonRpgTunnelUrl) {
      return $polygonRpgTunnelUrl
    }

    Start-Sleep -Milliseconds 250
  }

  throw 'Timed out while waiting for the Cloudflare Tunnel URL.'
}

function Start-PolygonRpgTunnel {
  $polygonRpgExistingProcess = Get-PolygonRpgTunnelProcess
  if ($null -ne $polygonRpgExistingProcess) {
    $polygonRpgExistingUrl = Get-PolygonRpgTunnelUrl
    if ($null -ne $polygonRpgExistingUrl) {
      return $polygonRpgExistingUrl
    }

    throw 'The Polygon RPG tunnel is running, but its URL is unavailable. Run dev stop-tunnel and try again.'
  }

  Remove-PolygonRpgTunnelState
  New-Item -ItemType Directory -Path $polygonRpgStateDirectory -Force | Out-Null

  $polygonRpgCloudflared = Get-Command -Name cloudflared.exe -CommandType Application -ErrorAction Stop |
    Select-Object -First 1
  $polygonRpgTunnelProcess = Start-Process `
    -FilePath $polygonRpgCloudflared.Source `
    -ArgumentList @('tunnel', '--url', $polygonRpgOriginUrl) `
    -RedirectStandardOutput $polygonRpgOutputPath `
    -RedirectStandardError $polygonRpgErrorPath `
    -WorkingDirectory $polygonRpgStateDirectory `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -LiteralPath $polygonRpgPidPath -Value $polygonRpgTunnelProcess.Id -NoNewline

  try {
    return Wait-ForPolygonRpgTunnelUrl -TunnelProcess $polygonRpgTunnelProcess
  } catch {
    if (-not $polygonRpgTunnelProcess.HasExited) {
      Stop-Process -Id $polygonRpgTunnelProcess.Id
    }
    Remove-PolygonRpgTunnelState
    throw
  }
}

function Stop-PolygonRpgTunnel {
  $polygonRpgTunnelProcess = Get-PolygonRpgTunnelProcess
  if ($null -ne $polygonRpgTunnelProcess) {
    Stop-Process -Id $polygonRpgTunnelProcess.ProcessId
  }
  Remove-PolygonRpgTunnelState
  Write-Host 'Polygon RPG tunnel stopped.'
}

switch ($Action) {
  'url' {
    $polygonRpgTunnelProcess = Get-PolygonRpgTunnelProcess
    $polygonRpgTunnelUrl = Get-PolygonRpgTunnelUrl
    if ($null -eq $polygonRpgTunnelProcess -or $null -eq $polygonRpgTunnelUrl) {
      Write-Host 'Polygon RPG tunnel is not running.'
      return
    }
    Write-PolygonRpgTunnelLink -TunnelUrl $polygonRpgTunnelUrl
  }
  'stop-tunnel' {
    Stop-PolygonRpgTunnel
  }
  'start' {
    $polygonRpgTunnelUrl = Start-PolygonRpgTunnel
    Write-PolygonRpgTunnelLink -TunnelUrl $polygonRpgTunnelUrl
    Write-Host 'The tunnel stays open when the server stops. Run dev stop-tunnel when finished.'

    Push-Location -LiteralPath $polygonRpgRoot
    try {
      & node scripts/serve.mjs
    } finally {
      Pop-Location
    }
  }
}
