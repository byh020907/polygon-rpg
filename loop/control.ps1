[CmdletBinding()]
param(
  [ValidateSet('install', 'start', 'stop', 'status', 'enable', 'disable', 'run-once', 'uninstall')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'env.ps1')

$taskName = $script:LoopConfig.TaskName
$loopScript = Join-Path $PSScriptRoot 'loop.ps1'
$stopPath = Join-Path $PSScriptRoot 'STOP'
$pidPath = Join-Path $PSScriptRoot 'runner.pid'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

function Get-LoopTask {
  return Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}

function Install-LoopTask {
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$loopScript`""
  $taskAction = New-ScheduledTaskAction `
    -Execute $script:LoopConfig.PowerShellPath `
    -Argument $arguments `
    -WorkingDirectory $script:LoopConfig.RepoRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
  $principal = New-ScheduledTaskPrincipal `
    -UserId $userId `
    -LogonType Interactive `
    -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount $script:LoopConfig.RestartCount `
    -RestartInterval (New-TimeSpan -Minutes $script:LoopConfig.RestartDelayMinutes) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew
  $task = New-ScheduledTask `
    -Action $taskAction `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description 'Polygon RPG Codex fresh-session file-memory development loop'
  Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
  Disable-ScheduledTask -TaskName $taskName | Out-Null
  Write-Host "Task Scheduler 등록 완료(비활성): $taskName"
}

switch ($Action) {
  'install' {
    Install-LoopTask
  }
  'start' {
    if (-not (Get-LoopTask)) { Install-LoopTask }
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
    Enable-ScheduledTask -TaskName $taskName | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Loop 시작: $taskName"
  }
  'stop' {
    New-Item -ItemType File -Path $stopPath -Force | Out-Null
    Write-Host 'STOP 기록 완료 · 현재 entry가 끝나면 정상 종료합니다.'
  }
  'status' {
    $task = Get-LoopTask
    $taskInfo = if ($task) { Get-ScheduledTaskInfo -TaskName $taskName } else { $null }
    [pscustomobject]@{
      TaskName = $taskName
      Installed = $null -ne $task
      State = if ($task) { $task.State } else { $null }
      Enabled = if ($task) { $task.State -ne 'Disabled' } else { $false }
      LastRunTime = if ($taskInfo) { $taskInfo.LastRunTime } else { $null }
      LastTaskResult = if ($taskInfo) { $taskInfo.LastTaskResult } else { $null }
      StopRequested = Test-Path -LiteralPath $stopPath
      RunnerPid = if (Test-Path -LiteralPath $pidPath) { Get-Content -Raw $pidPath } else { $null }
    } | Format-List
  }
  'enable' {
    if (-not (Get-LoopTask)) { Install-LoopTask }
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
    Enable-ScheduledTask -TaskName $taskName | Out-Null
    Write-Host "Loop 자동 시작 활성화: $taskName"
  }
  'disable' {
    Disable-ScheduledTask -TaskName $taskName | Out-Null
    Write-Host "Loop 자동 시작 비활성화: $taskName"
  }
  'run-once' {
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
    & $script:LoopConfig.PowerShellPath -NoProfile -ExecutionPolicy Bypass -File $loopScript -Once
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  'uninstall' {
    $task = Get-LoopTask
    if ($task -and $task.State -eq 'Running') {
      throw '실행 중인 task는 먼저 stop 완료 후 제거해야 합니다.'
    }
    if ($task) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
    Write-Host "Loop task 제거: $taskName"
  }
}
