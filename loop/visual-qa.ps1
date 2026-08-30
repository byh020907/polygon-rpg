[CmdletBinding()]
param(
  [string]$GameStart = $env:GAME_START,
  [int]$GameFrame = $(if ($env:GAME_FRAME) { [int]$env:GAME_FRAME } else { -1 }),
  [string]$OutputDirectory = $env:VISUAL_QA_OUTPUT
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'env.ps1')

if ([string]::IsNullOrWhiteSpace($GameStart)) {
  $GameStart = $script:LoopConfig.DefaultGameStart
}
if ($GameFrame -lt 0) {
  $GameFrame = $script:LoopConfig.DefaultGameFrame
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutputDirectory = Join-Path $script:LoopConfig.RepoRoot "$($script:LoopConfig.ArtifactRoot)\$stamp-$GameStart"
}

$arguments = @(
  (Join-Path $PSScriptRoot 'visual-qa.mjs'),
  '--repo', $script:LoopConfig.RepoRoot,
  '--browser', $script:LoopConfig.BrowserPath,
  '--start', $GameStart,
  '--frame', [string]$GameFrame,
  '--output', $OutputDirectory,
  '--width', [string]$script:LoopConfig.ViewportWidth,
  '--height', [string]$script:LoopConfig.ViewportHeight
)

& $script:LoopConfig.NodePath @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Visual QA가 실패했습니다: exit $LASTEXITCODE"
}
