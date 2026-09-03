param(
  [Parameter(Mandatory = $true)]
  [string]$NodePath,
  [Parameter(Mandatory = $true)]
  [string]$CliPath,
  [Parameter(Mandatory = $true)]
  [ValidateSet('backend', 'tick')]
  [string]$TaskCommand,
  [Parameter(Mandatory = $true)]
  [string]$RepoPath
)

$ErrorActionPreference = 'Stop'
$node = [System.IO.Path]::GetFullPath($NodePath)
$cli = [System.IO.Path]::GetFullPath($CliPath)
$repo = [System.IO.Path]::GetFullPath($RepoPath)

Set-Location -LiteralPath $repo
& $node $cli $TaskCommand --repo $repo --output json
exit $LASTEXITCODE
