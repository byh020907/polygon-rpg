<#
.SYNOPSIS
Copy the small OpenCode loop and common ntfy notifier into a product repository.
.DESCRIPTION
Requires Node 20+, OpenCode and a Git product repository with AGENTS.md and selected Method sources.
Copies .ai/runtime/opencode-loop, .ai/runtime/common/notify.mjs and three .opencode/agents files.
No model calls or product work. -Schedule optionally registers ONE hidden user task (10 minute interval).
Runtime help: node .ai/runtime/opencode-loop/loop.mjs --help
Notifications: optional PGL_NTFY_URL (full topic URL), PGL_NTFY_TOKEN environment variables; notify.mjs --help.
Existing differing files are refused. Stop old workers/tasks and preserve the old installation before migration.
.EXAMPLE
pwsh -File .\install.ps1 -ProjectPath C:\projects\my-product -DryRun
.EXAMPLE
pwsh -File .\install.ps1 -ProjectPath C:\projects\my-product -Schedule
#>
param([Parameter(Mandatory)][string]$ProjectPath, [switch]$Schedule,
  [ValidateRange(1,1440)][int]$IntervalMinutes = 10, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$repo = (& git -C $ProjectPath rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0) { throw 'ProjectPath must be a Git repository.' }
$repo = [IO.Path]::GetFullPath($repo.Trim())
$source = $PSScriptRoot
$target = Join-Path $repo '.ai/runtime/opencode-loop'
if (Test-Path -LiteralPath (Join-Path $target 'src')) {
  throw 'Old adapter found. Pause the old loop, wait for its worker, disable its Backend/Tick tasks and watchdog, preserve the old runtime directory and candidate worktrees, then retry. See adapter README migration notes.'
}
$copies = @()
foreach ($name in @('loop.mjs','worker.md','manager.md','verifier.md','pgl-opencode.cmd')) {
  $copies += @{from=(Join-Path $source $name); to=(Join-Path $target $name)}
}
$copies += @{from=(Join-Path $source '../common/notify.mjs'); to=(Join-Path $repo '.ai/runtime/common/notify.mjs')}
foreach ($role in @('manager','worker','verifier')) {
  $copies += @{from=(Join-Path $source "$role.md"); to=(Join-Path $repo ".opencode/agents/product-goal-loop-$role.md")}
}
foreach ($item in $copies) {
  if ((Test-Path -LiteralPath $item.to) -and ((Get-FileHash -LiteralPath $item.from).Hash -ne (Get-FileHash -LiteralPath $item.to).Hash)) {
    throw "Existing differing file: $($item.to). Preserve/reconcile it before installing."
  }
}
if ($DryRun) { @{copies=$copies; schedule=[bool]$Schedule; intervalMinutes=$IntervalMinutes} | ConvertTo-Json -Depth 4; exit 0 }
foreach ($item in $copies) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $item.to) -Force | Out-Null
  Copy-Item -LiteralPath $item.from -Destination $item.to -Force
}
if ($Schedule) {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $cli = Join-Path $target 'loop.mjs'
  $command = "& '" + $node.Replace("'","''") + "' '" + $cli.Replace("'","''") + "' run --repo '" + $repo.Replace("'","''") + "'; exit `$LASTEXITCODE"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
  $name = 'PGL OpenCode ' + [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($repo.ToLowerInvariant()))).Substring(0,12)
  $action = New-ScheduledTaskAction -Execute (Get-Command powershell.exe).Source -Argument "-NoProfile -WindowStyle Hidden -EncodedCommand $encoded" -WorkingDirectory $repo
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes($IntervalMinutes) -RepetitionInterval ([TimeSpan]::FromMinutes($IntervalMinutes))
  $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
}
@{installed=$target; scheduled=[bool]$Schedule; next="node `"$target/loop.mjs`" --help"} | ConvertTo-Json
