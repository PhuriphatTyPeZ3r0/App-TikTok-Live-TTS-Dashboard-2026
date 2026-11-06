param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt,

    [string]$Model = "omniroute/auto/best-coding",

    [string]$File = "",

    [string]$WorkDir = "",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $WorkDir) {
    $WorkDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

# Ensure OMNIROUTE_API_KEY is available in the environment
if (-not $env:OMNIROUTE_API_KEY) {
    $userKey = [Environment]::GetEnvironmentVariable("OMNIROUTE_API_KEY", "User")
    if ($userKey) {
        $env:OMNIROUTE_API_KEY = $userKey
    } elseif (Test-Path "C:\Users\iznamu\.omniroute\.env") {
        $envLines = Get-Content "C:\Users\iznamu\.omniroute\.env"
        foreach ($line in $envLines) {
            if ($line -match "^OMNIROUTE_API_KEY=(.+)$") {
                $env:OMNIROUTE_API_KEY = $Matches[1].Trim()
                break
            }
        }
    }
}

if ($DryRun) {
    Write-Output "[DRY-RUN] WorkDir=$WorkDir | opencode run --auto --standalone -m $Model `"$Prompt`""
    exit 0
}

Push-Location $WorkDir
try {
    $argsList = @("run", "--auto", "--standalone", "-m", $Model)
    if ($File -and (Test-Path $File)) {
        $argsList += @("-f", $File)
    }
    $argsList += $Prompt

    Write-Host ">>> Dispatching task to OpenCode ($Model)..." -ForegroundColor Cyan
    & opencode @argsList
    if ($LASTEXITCODE -ne 0) {
        throw "opencode exited with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
