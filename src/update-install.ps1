param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [Parameter(Mandatory = $true)][string]$InstallDir,
    [Parameter(Mandatory = $true)][string]$LaunchScript,
    [Parameter(Mandatory = $true)][string]$StatusFile,
    [Parameter(Mandatory = $true)][string]$ExpectedVersion
)

$ErrorActionPreference = "Stop"

function Write-UpdateStatus([string]$Phase, [string]$Message) {
    $value = @{ phase = $Phase; version = $ExpectedVersion; error = $Message; updatedAt = [DateTime]::UtcNow.ToString("o") }
    $json = $value | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($StatusFile, $json, (New-Object System.Text.UTF8Encoding($false)))
}

try {
    $root = [System.IO.Path]::GetFullPath($InstallDir)
    $target = [System.IO.Path]::GetFullPath($Installer)
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Installateur introuvable." }
    if (-not (Test-Path -LiteralPath (Join-Path $root "manifest.json") -PathType Leaf)) { throw "Installation BARZ introuvable." }

    # NSIS closes the running BARZ Node processes before replacing the files.
    $process = Start-Process -FilePath $target -ArgumentList @('/S', "/D=$root") -PassThru -Wait
    if ($process.ExitCode -ne 0) { throw "L’installateur a quitté avec le code $($process.ExitCode)." }
    $manifest = Get-Content -LiteralPath (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
    if ($manifest.version -ne $ExpectedVersion) { throw "La nouvelle version n’a pas été installée." }
    Write-UpdateStatus "complete" ""
    Start-Process -FilePath (Join-Path $env:WINDIR "System32\wscript.exe") -ArgumentList @("`"$LaunchScript`"") -WindowStyle Hidden
}
catch {
    $message = $_.Exception.Message
    Write-UpdateStatus "failed" $message
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("La mise à jour BARZ a échoué : $message", "BARZ Suite", "OK", "Error") | Out-Null
    exit 1
}
