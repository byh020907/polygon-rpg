$script:LoopConfig = [ordered]@{
  RepoRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
  CodexPath = 'C:\Users\byh02\AppData\Roaming\npm\codex.ps1'
  NodePath = 'C:\Program Files\nodejs\node.exe'
  GitPath = 'C:\Program Files\Git\cmd\git.exe'
  PowerShellPath = 'C:\Users\byh02\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
  BrowserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
  TaskName = 'PolygonRpgFileMemoryLoop'
  Model = 'gpt-5.6-sol'
  ReasoningEffort = 'xhigh'
  IdleSeconds = 30
  MaxRuns = 0
  RestartDelayMinutes = 1
  RestartCount = 999
  ArtifactRoot = 'artifacts\visual-qa'
  LogRoot = 'logs'
  DefaultGameStart = 'academy'
  DefaultGameFrame = 180
  ViewportWidth = 1440
  ViewportHeight = 810
}

$requiredPaths = @(
  $script:LoopConfig.CodexPath,
  $script:LoopConfig.NodePath,
  $script:LoopConfig.GitPath,
  $script:LoopConfig.PowerShellPath,
  $script:LoopConfig.BrowserPath
)
foreach ($requiredPath in $requiredPaths) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Loop dependency를 찾을 수 없습니다: $requiredPath"
  }
}

$pathDirectories = $requiredPaths | ForEach-Object { Split-Path -Parent $_ } | Select-Object -Unique
$env:PATH = ($pathDirectories + @($env:SystemRoot, "$env:SystemRoot\System32")) -join ';'
