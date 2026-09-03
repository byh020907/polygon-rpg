<#
.SYNOPSIS
Vendors and configures the Windows OpenCode Product Goal Loop adapter in one product repository.

.DESCRIPTION
Copies only adapter-owned runtime and OpenCode template files, then invokes the vendored self-describing CLI setup command. Use -DryRun to print every target without changing files, Scheduled Tasks, sessions, Git refs, or processes. After installation, use .ai\runtime\opencode-loop\pgl-opencode.cmd --help as the canonical operating reference.

.PARAMETER ProjectPath
Absolute or relative path to a Git product repository that already contains the Product Goal Loop project sources.

.PARAMETER IntervalMinutes
Windows Scheduled Task tick interval. Default: 10.

.PARAMETER Remote
Integration Git remote. Default: origin.

.PARAMETER Branch
Integration branch. Default: main.

.PARAMETER DryRun
Print the vendoring plan without changing anything.

.EXAMPLE
pwsh -File .\install.ps1 -ProjectPath C:\projects\my-product -DryRun

.EXAMPLE
pwsh -File .\install.ps1 -ProjectPath C:\projects\my-product
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath,
  [int]$IntervalMinutes = 10,
  [string]$Remote = 'origin',
  [string]$Branch = 'main',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$source = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSCommandPath))
$project = [System.IO.Path]::GetFullPath($ProjectPath)
$target = [System.IO.Path]::GetFullPath((Join-Path $project '.ai\runtime\opencode-loop'))
$projectPrefix = $project.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $target.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Adapter target escaped the project: $target"
}

$managed = @('bin', 'src', 'scripts', 'package.json', 'config.default.json', 'README.md', 'install.ps1', 'pgl-opencode.cmd')
$templateFiles = @(
  '.opencode\agents\product-goal-loop-manager.md',
  '.opencode\agents\product-goal-loop-worker.md',
  '.opencode\agents\product-goal-loop-verifier.md',
  '.opencode\agents\product-goal-loop-reconciliation.md',
  '.opencode\tools\product_goal_loop.js'
)
if ($DryRun) {
  [ordered]@{ source = $source; target = $target; managedEntries = $managed; templateFiles = $templateFiles; setup = $true } | ConvertTo-Json -Depth 4
  exit 0
}

foreach ($relativePath in $templateFiles) {
  $from = Join-Path (Join-Path $source 'templates') $relativePath
  $to = Join-Path (Join-Path $target 'templates') $relativePath
  New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Force
}

New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($entry in $managed) {
  $from = Join-Path $source $entry
  if (-not (Test-Path -LiteralPath $from)) { continue }
  $to = Join-Path $target $entry
  if (Test-Path -LiteralPath $from -PathType Container) {
    New-Item -ItemType Directory -Path $to -Force | Out-Null
    Copy-Item -Path (Join-Path $from '*') -Destination $to -Recurse -Force
  }
  else {
    Copy-Item -LiteralPath $from -Destination $to -Force
  }
}

$cli = Join-Path $target 'bin\pgl-opencode.mjs'
& node $cli setup --repo $project --schedule-minutes $IntervalMinutes --remote $Remote --branch $Branch --yes
exit $LASTEXITCODE
