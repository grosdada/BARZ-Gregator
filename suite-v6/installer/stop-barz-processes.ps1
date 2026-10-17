param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,

    [int]$AtlasPort = 4326
)

$ErrorActionPreference = "Stop"
$targetNode = [System.IO.Path]::GetFullPath((Join-Path $InstallDir "core\node.exe"))

function Get-BarzNodeProcesses {
    @(
        Get-Process -Name "node" -ErrorAction SilentlyContinue |
            Where-Object {
                try {
                    $_.Path -and ([System.IO.Path]::GetFullPath($_.Path) -ieq $targetNode)
                }
                catch {
                    $false
                }
            }
    )
}

function Get-StaleAtlasProcesses {
    try {
        $ownerIds = @(
            Get-NetTCPConnection -LocalPort $AtlasPort -State Listen -ErrorAction Stop |
                Select-Object -ExpandProperty OwningProcess -Unique
        )
    }
    catch {
        return @()
    }

    @(
        foreach ($ownerId in $ownerIds) {
            try {
                $details = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction Stop
                if ($details.Name -ieq "node.exe" -and $details.CommandLine -match "apps[\\/]atlas[\\/]server\.js") {
                    Get-Process -Id $ownerId -ErrorAction Stop
                }
            }
            catch {
                continue
            }
        }
    )
}

$barzProcesses = @(
    @(Get-BarzNodeProcesses)
    @(Get-StaleAtlasProcesses)
) | Sort-Object -Property Id -Unique
foreach ($process in $barzProcesses) {
    Stop-Process -Id $process.Id -Force -ErrorAction Stop
}

$deadline = [DateTime]::UtcNow.AddSeconds(10)
do {
    $remaining = @(
        @(Get-BarzNodeProcesses)
        @(Get-StaleAtlasProcesses)
    ) | Sort-Object -Property Id -Unique
    if ($remaining.Count -eq 0) {
        exit 0
    }
    Start-Sleep -Milliseconds 150
} while ([DateTime]::UtcNow -lt $deadline)

Write-Error "BARZ Suite 6 is still running. Close Prompt Atlas and Barz-Gregator, then retry."
exit 2
