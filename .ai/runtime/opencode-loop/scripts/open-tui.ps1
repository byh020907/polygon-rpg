param(
  [Parameter(Mandatory = $true)]
  [string]$OpenCodePath,
  [Parameter(Mandatory = $true)]
  [string]$ServerUrl,
  [Parameter(Mandatory = $true)]
  [string]$Directory,
  [string]$SessionId = ''
)

$ErrorActionPreference = 'Stop'
$binary = [System.IO.Path]::GetFullPath($OpenCodePath)
$workingDirectory = [System.IO.Path]::GetFullPath($Directory)
$arguments = @('attach', $ServerUrl, '--dir', $workingDirectory)
if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
  $arguments += @('--session', $SessionId)
}

Set-Location -LiteralPath $workingDirectory
& $binary @arguments
exit $LASTEXITCODE
