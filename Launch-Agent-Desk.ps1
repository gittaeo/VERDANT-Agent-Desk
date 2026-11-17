$ErrorActionPreference = 'Stop'
$bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$agentNode = if ($nodeCommand) { $nodeCommand.Source } else { $bundledNode }
if (-not (Test-Path -LiteralPath $agentNode)) { throw 'Node.js 22.13 이상을 설치한 뒤 다시 실행하세요.' }
$agentScript = Join-Path $PSScriptRoot 'scripts/local-dashboard.mjs'
$hashEngine = [Security.Cryptography.SHA256]::Create()
try { $workspaceId = ([BitConverter]::ToString($hashEngine.ComputeHash([Text.Encoding]::UTF8.GetBytes($PSScriptRoot.ToLowerInvariant())))).Replace('-','').ToLowerInvariant().Substring(0,12) } finally { $hashEngine.Dispose() }
$configuredPort = if ($env:VERDANT_PORT) { $env:VERDANT_PORT } else { '5177' }
if (-not $env:VERDANT_PORT) {
    $localSettings = Join-Path $PSScriptRoot '.env.local'
    if (Test-Path -LiteralPath $localSettings) {
        $portLine = Get-Content -LiteralPath $localSettings | Where-Object { $_ -match '^\s*VERDANT_PORT\s*=\s*\d+\s*$' } | Select-Object -Last 1
        if ($portLine) { $configuredPort = ($portLine -split '=',2)[1].Trim() }
    }
}
$firstPort = 0
if (-not [int]::TryParse($configuredPort,[ref]$firstPort) -or $firstPort -lt 1024 -or $firstPort -gt 65525) { throw 'VERDANT_PORT는 1024~65525의 포트여야 합니다.' }
$ready = $false
for ($offset=0; $offset -lt 10 -and -not $ready; $offset++) {
    $agentPort = $firstPort + $offset
    $agentUrl = "http://127.0.0.1:$agentPort"
    try { $state = Invoke-RestMethod "$agentUrl/api/desk/status" -TimeoutSec 1; $ready = $state.execution -eq 'local' -and $state.workspaceId -eq $workspaceId -and $state.runtimeVersion -eq 'codex-local-v1' } catch {}
    if ($ready) { break }
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$agentPort)
    try { $listener.Start() } catch { continue } finally { $listener.Stop() }
    $oldPort = $env:VERDANT_PORT
    try {
        $env:VERDANT_PORT = [string]$agentPort
        Start-Process -FilePath $agentNode -ArgumentList @('"' + $agentScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    } finally { $env:VERDANT_PORT = $oldPort }
    for ($attempt=0; $attempt -lt 25; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $state = Invoke-RestMethod "$agentUrl/api/desk/status" -TimeoutSec 1; if ($state.workspaceId -eq $workspaceId -and $state.runtimeVersion -eq 'codex-local-v1') { $ready=$true; break } } catch {}
    }
}
if (-not $ready) { throw '서버를 시작하지 못했습니다. 사용 가능한 포트와 .env.local 설정을 확인하세요.' }
Start-Process "$agentUrl/agents"
