$ErrorActionPreference = 'Stop'
$bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$agentNode = if ($nodeCommand) { $nodeCommand.Source } else { $bundledNode }
if (-not (Test-Path -LiteralPath $agentNode)) { throw 'Node.js 22.13 이상을 설치한 뒤 다시 실행하세요.' }
$agentScript = Join-Path $PSScriptRoot 'scripts/local-dashboard.mjs'
$agentPort = if ($env:VERDANT_PORT) { $env:VERDANT_PORT } else { '5177' }
$agentUrl = "http://127.0.0.1:$agentPort"
$ready = $false
try { $state = Invoke-RestMethod "$agentUrl/api/desk/status" -TimeoutSec 2; $ready = $state.execution -eq 'local' } catch {}
if (-not $ready) {
    Start-Process -FilePath $agentNode -ArgumentList @('"' + $agentScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $state = Invoke-RestMethod "$agentUrl/api/desk/status" -TimeoutSec 1; if ($state.execution -eq 'local') { $ready = $true; break } } catch {}
    }
}
if (-not $ready) { throw '서버를 시작하지 못했습니다. 포트 충돌과 .env.local 설정을 확인하세요.' }
Start-Process "$agentUrl/agents"
