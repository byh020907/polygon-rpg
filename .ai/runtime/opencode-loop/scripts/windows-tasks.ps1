param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('install', 'remove', 'enable', 'disable', 'run', 'status')]
  [string]$Action,
  [Parameter(Mandatory = $true)]
  [string]$RepoPath,
  [Parameter(Mandatory = $true)]
  [string]$NodePath,
  [Parameter(Mandatory = $true)]
  [string]$CliPath,
  [Parameter(Mandatory = $true)]
  [string]$RepoKey,
  [int]$IntervalMinutes = 10,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath($RepoPath)
$node = [System.IO.Path]::GetFullPath($NodePath)
$cli = [System.IO.Path]::GetFullPath($CliPath)
$backendName = "PGL OpenCode Backend $RepoKey"
$tickName = "PGL OpenCode Tick $RepoKey"
$taskEntry = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSCommandPath) 'task-entry.ps1'))
$taskPowerShell = [System.IO.Path]::GetFullPath((Join-Path $PSHOME 'powershell.exe'))

function Quote-TaskArgument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

$commonArgs = "-NoLogo -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $(Quote-TaskArgument $taskEntry) -NodePath $(Quote-TaskArgument $node) -CliPath $(Quote-TaskArgument $cli)"
$backendArgs = "$commonArgs -TaskCommand backend -RepoPath $(Quote-TaskArgument $repo)"
$tickArgs = "$commonArgs -TaskCommand tick -RepoPath $(Quote-TaskArgument $repo)"

function Describe-Task([string]$Name, [string]$Arguments) {
  return [ordered]@{
    name = $Name
    executable = $taskPowerShell
    arguments = $Arguments
    workingDirectory = $repo
  }
}

if ($DryRun) {
  [ordered]@{
    action = $Action
    backend = Describe-Task $backendName $backendArgs
    tick = Describe-Task $tickName $tickArgs
    intervalMinutes = $IntervalMinutes
  } | ConvertTo-Json -Depth 5
  exit 0
}

function Get-TaskSafe([string]$Name) {
  return Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
}

switch ($Action) {
  'install' {
    $backendAction = New-ScheduledTaskAction -Execute $taskPowerShell -Argument $backendArgs -WorkingDirectory $repo
    $tickAction = New-ScheduledTaskAction -Execute $taskPowerShell -Argument $tickArgs -WorkingDirectory $repo
    $backendTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $tickTrigger = New-ScheduledTaskTrigger -Once -At ([DateTime]::Now.AddMinutes(1)) `
      -RepetitionInterval ([TimeSpan]::FromMinutes($IntervalMinutes)) `
      -RepetitionDuration ([TimeSpan]::FromDays(3650))
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
      -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 `
      -RestartInterval ([TimeSpan]::FromMinutes(1)) -ExecutionTimeLimit ([TimeSpan]::Zero)
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $backendName -Action $backendAction -Trigger $backendTrigger `
      -Settings $settings -Description 'Local OpenCode backend for Product Goal Loop live sessions.' `
      -Principal $principal -Force | Out-Null
    Register-ScheduledTask -TaskName $tickName -Action $tickAction -Trigger $tickTrigger `
      -Settings $settings -Description 'Product Goal Loop thin dispatcher; performs at most one Execution Goal per tick.' `
      -Principal $principal -Force | Out-Null
    Start-ScheduledTask -TaskName $backendName
  }
  'remove' {
    foreach ($name in @($tickName, $backendName)) {
      if (Get-TaskSafe $name) {
        Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
      }
    }
  }
  'enable' {
    Enable-ScheduledTask -TaskName $tickName | Out-Null
  }
  'disable' {
    if (Get-TaskSafe $tickName) { Disable-ScheduledTask -TaskName $tickName | Out-Null }
  }
  'run' {
    Start-ScheduledTask -TaskName $tickName
  }
  'status' {
    $rows = foreach ($name in @($backendName, $tickName)) {
      $task = Get-TaskSafe $name
      if ($task) {
        $info = Get-ScheduledTaskInfo -TaskName $name -ErrorAction SilentlyContinue
        [ordered]@{
          name = $name
          exists = $true
          state = [string]$task.State
          enabled = $task.Settings.Enabled
          actions = @($task.Actions | ForEach-Object {
            [ordered]@{ execute = $_.Execute; arguments = $_.Arguments; workingDirectory = $_.WorkingDirectory }
          })
          triggers = @($task.Triggers | ForEach-Object {
            [ordered]@{ enabled = $_.Enabled; startBoundary = $_.StartBoundary; repetitionInterval = $_.Repetition.Interval }
          })
          lastRunTime = $info.LastRunTime
          lastTaskResult = $info.LastTaskResult
          nextRunTime = $info.NextRunTime
        }
      }
      else {
        [ordered]@{ name = $name; exists = $false; state = 'Missing'; enabled = $false }
      }
    }
    $rows | ConvertTo-Json -Depth 4
    exit 0
  }
}

[ordered]@{
  action = $Action
  backendTask = $backendName
  tickTask = $tickName
  ok = $true
} | ConvertTo-Json -Depth 4
