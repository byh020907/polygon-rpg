[CmdletBinding()]
param(
  [switch]$Once,
  [string]$Entry
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'env.ps1')

$stopPath = Join-Path $PSScriptRoot 'STOP'
$pidPath = Join-Path $PSScriptRoot 'runner.pid'
$repoRoot = $script:LoopConfig.RepoRoot
$logRoot = Join-Path $repoRoot $script:LoopConfig.LogRoot

function Get-LoopEntry {
  if (-not [string]::IsNullOrWhiteSpace($Entry)) {
    return [pscustomobject]@{ id = $Entry; status = 'explicit' }
  }

  $json = & $script:LoopConfig.NodePath (Join-Path $PSScriptRoot 'inbox.mjs') next --repo $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw 'INBOX next entry 조회가 실패했습니다.'
  }
  $selection = $json | ConvertFrom-Json
  if ($null -ne $selection.directClaim) {
    return [pscustomobject]@{
      id = 'DIRECT-CLAIM'
      status = $selection.directClaim.status
      claimedEntry = $selection.directClaim.id
    }
  }
  $next = $selection.entry
  if ($null -eq $next) {
    return [pscustomobject]@{ id = 'ROADMAP'; status = 'converging' }
  }
  return $next
}

function Get-CompletionEvidence {
  param([string]$EntryId)

  $json = & $script:LoopConfig.NodePath (Join-Path $PSScriptRoot 'completion.mjs') inspect --repo $repoRoot --entry $EntryId
  if ($LASTEXITCODE -ne 0) {
    throw 'Loop durable completion 조회가 실패했습니다.'
  }
  return $json | ConvertFrom-Json
}

function Write-RunSummary {
  param(
    [string]$Path,
    [hashtable]$Summary
  )
  $Summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding utf8
}

if (Test-Path -LiteralPath $pidPath) {
  $existingPid = Get-Content -Raw -LiteralPath $pidPath
  if ($existingPid -match '^\d+$' -and (Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue)) {
    throw "File-memory loop가 이미 실행 중입니다: PID $existingPid"
  }
}
Set-Content -LiteralPath $pidPath -Value $PID -NoNewline

try {
  $runCount = 0
  while ($true) {
    if (Test-Path -LiteralPath $stopPath) {
      Write-Host 'STOP 감지 · 진행 중인 entry 없음 · 정상 종료'
      exit 0
    }

    $nextEntry = Get-LoopEntry
    $entryId = $nextEntry.id
    if ($entryId -eq 'DIRECT-CLAIM') {
      Write-Host "Direct lane이 $($nextEntry.claimedEntry)을 소유해 background loop가 대기합니다."
      if ($Once) { exit 0 }
      Start-Sleep -Seconds $script:LoopConfig.IdleSeconds
      continue
    }
    $isRoadmapRun = $entryId -eq 'ROADMAP'
    $runStartedAt = Get-Date
    $runStamp = $runStartedAt.ToString('yyyyMMdd-HHmmss')
    $runDirectory = Join-Path $logRoot "$($runStartedAt.ToString('yyyy-MM-dd'))\$runStamp-$entryId"
    New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
    $eventsPath = Join-Path $runDirectory 'events.jsonl'
    $lastMessagePath = Join-Path $runDirectory 'last-message.md'
    $summaryPath = Join-Path $runDirectory 'summary.json'
    $startHead = & $script:LoopConfig.GitPath -C $repoRoot rev-parse HEAD

    $prompt = if ($isRoadmapRun) { @"
Operation mode: ROADMAP_CONVERGE

Read loop/PROMPT.md completely and execute only its ROADMAP_CONVERGE mode. This is a fresh, memoryless Codex session. The canonical prompt owns the full procedure and completion gate; do not substitute a skill workflow or stop at a checkpoint.
"@ } else { @"
Operation mode: BACKGROUND_ENTRY
Entry: $entryId

Read loop/PROMPT.md completely and execute only its BACKGROUND_ENTRY mode for the exact entry above. This is a fresh, memoryless Codex session. The canonical prompt owns the full procedure and completion gate; do not substitute a skill workflow or stop at a checkpoint.
"@ }

    $codexArguments = @(
      'exec',
      '--ephemeral',
      '--json',
      '--output-last-message', $lastMessagePath,
      '--cd', $repoRoot,
      '--model', $script:LoopConfig.Model,
      '--sandbox', 'danger-full-access',
      '--config', 'approval_policy="never"',
      '--config', "model_reasoning_effort='$($script:LoopConfig.ReasoningEffort)'",
      '-'
    )

    $env:GAME_START = $script:LoopConfig.DefaultGameStart
    $env:GAME_FRAME = [string]$script:LoopConfig.DefaultGameFrame
    $env:VISUAL_QA_OUTPUT = Join-Path $repoRoot "$($script:LoopConfig.ArtifactRoot)\$runStamp-$entryId"

    $prompt | & $script:LoopConfig.CodexPath @codexArguments 2>&1 |
      Tee-Object -FilePath $eventsPath
    $codexExitCode = $LASTEXITCODE

    & $script:LoopConfig.GitPath -C $repoRoot fetch origin --prune
    if ($LASTEXITCODE -ne 0) {
      throw '완료 검증 전 origin fetch가 실패했습니다.'
    }
    $endHead = & $script:LoopConfig.GitPath -C $repoRoot rev-parse HEAD
    $completionEvidence = Get-CompletionEvidence -EntryId $entryId
    $statusPath = Join-Path $repoRoot 'docs\STATUS.md'
    $latestSubject = & $script:LoopConfig.GitPath -C $repoRoot log -1 --format=%s
    $roadmapComplete = $isRoadmapRun -and
      (Select-String -LiteralPath $statusPath -SimpleMatch '- Loop completion: VERIFIED' -Quiet) -and
      $latestSubject -eq '루프 전체 완료 증명'
    $progressed = $endHead -ne $startHead
    $completed = if ($isRoadmapRun) {
      ($progressed -or $roadmapComplete) -and $completionEvidence.complete
    } else {
      $completionEvidence.complete
    }
    $blocked = if ($isRoadmapRun) {
      (Select-String -LiteralPath $statusPath -SimpleMatch '- Loop blocker:' -Quiet) -and
        $completionEvidence.repositoryDurable
    } else {
      $completionEvidence.blocked
    }

    Write-RunSummary -Path $summaryPath -Summary ([ordered]@{
      entry = $entryId
      startedAt = $runStartedAt.ToString('o')
      finishedAt = (Get-Date).ToString('o')
      startHead = $startHead
      endHead = $endHead
      codexExitCode = $codexExitCode
      completed = $completed
      blocked = $blocked
      roadmapComplete = $roadmapComplete
      completionEvidence = $completionEvidence
      events = $eventsPath
      lastMessage = $lastMessagePath
      visualQa = $env:VISUAL_QA_OUTPUT
    })

    if ($codexExitCode -ne 0) {
      throw "Codex entry run이 비정상 종료했습니다: $entryId · exit $codexExitCode"
    }
    if (-not $completed -and -not $blocked) {
      throw "Codex session이 entry를 완결하지 않고 종료했습니다: $entryId"
    }

    $runCount++
    if ($Once -or $blocked -or $roadmapComplete -or (Test-Path -LiteralPath $stopPath)) {
      exit 0
    }
    if ($script:LoopConfig.MaxRuns -gt 0 -and $runCount -ge $script:LoopConfig.MaxRuns) {
      exit 0
    }
    Start-Sleep -Seconds $script:LoopConfig.IdleSeconds
  }
} catch {
  Write-Error $_
  exit 1
} finally {
  if (Test-Path -LiteralPath $pidPath) {
    $ownedPid = Get-Content -Raw -LiteralPath $pidPath
    if ($ownedPid -eq [string]$PID) {
      Remove-Item -LiteralPath $pidPath -Force
    }
  }
}
