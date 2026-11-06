param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt,

    [string]$Model = "omniroute/opencode-coding",

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
    Write-Output "[DRY-RUN] WorkDir=$WorkDir | Model=$Model (omniroute/auto/best-coding compatible) | opencode run --auto -m $Model `"$Prompt`""
    exit 0
}

Push-Location $WorkDir
try {
    $guardedPrompt = "$Prompt`n`nIMPORTANT TOOL RULE: Always invoke at most ONE tool call per response turn (never emit parallel tool_use blocks in the same turn)."
    $argsList = @("run", "--auto", "-m", $Model)
    if ($File -and (Test-Path $File)) {
        $argsList += @("-f", $File)
    }
    $argsList += $guardedPrompt

    & opencode service start *> $null
    Write-Host ">>> Dispatching task to OpenCode ($Model)..." -ForegroundColor Cyan
    # Pipe empty string to close stdin immediately so non-TTY subprocesses do not block waiting on EOF
    "" | & opencode @argsList
    if ($LASTEXITCODE -ne 0) {
        Write-Host ">>> Retrying after restarting OpenCode background service..." -ForegroundColor Yellow
        & opencode service restart *> $null
        Start-Sleep -Seconds 2
        "" | & opencode @argsList
        if ($LASTEXITCODE -ne 0) {
            throw "opencode exited with code $LASTEXITCODE"
        }
    }
} finally {
    Pop-Location
}
