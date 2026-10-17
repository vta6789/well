param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$tunnelProcess = $null
$serverProcess = $null
$savedEnv = @{}
foreach ($key in @('WF_DEMO', 'WF_DATA_DIR', 'WF_COOKIE_SECURE', 'WF_PUBLIC_ORIGIN')) {
    $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
    $binary = Join-Path $PSScriptRoot 'tools/cloudflare/cloudflared.exe'
    if (-not (Test-Path -LiteralPath $binary)) {
        throw 'Missing tools/cloudflare/cloudflared.exe. Download the Windows amd64 binary from https://developers.cloudflare.com/tunnel/downloads/'
    }
    $python = (Get-Command python -ErrorAction Stop).Source
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8002)
    try { $probe.Start() } finally { $probe.Stop() }
    $logDir = Join-Path $PSScriptRoot 'tools/cloudflare'
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $logDir "demo-$stamp-out.log"
    $stderr = Join-Path $logDir "demo-$stamp-err.log"
    $tunnelProcess = Start-Process -FilePath $binary -ArgumentList @('tunnel', '--url', 'http://127.0.0.1:8002') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    $url = $null
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if ($tunnelProcess.HasExited) { throw "Tunnel stopped. See $stderr" }
        $logs = (Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue) + (Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue)
        if ($logs -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0]; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $url) { throw "No tunnel URL received. See $stderr" }
    $env:WF_DEMO = '0'
    $env:WF_DATA_DIR = Join-Path $PSScriptRoot 'data/production'
    $env:WF_COOKIE_SECURE = '1'
    $env:WF_PUBLIC_ORIGIN = $url
    $serverLog = Join-Path $logDir "demo-$stamp-server.log"
    $serverProcess = Start-Process -FilePath $python -ArgumentList @('server.py', '--port', '8002') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "demo-$stamp-server-out.log") -RedirectStandardError $serverLog -PassThru
    $ready = $false
    $resolvedTunnelAddresses = @()
    $readyDeadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $readyDeadline) {
        if ($serverProcess.HasExited) { throw "Demo server stopped. See $serverLog" }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch {
            # A local DNS cache can lag behind a newly created quick tunnel.
            # Resolve through Cloudflare and retain TLS hostname verification.
            if (-not $resolvedTunnelAddresses.Count) {
                try {
                    $tunnelHost = ([Uri]$url).DnsSafeHost
                    $dns = Invoke-RestMethod -Uri "https://cloudflare-dns.com/dns-query?name=$tunnelHost&type=A" -Headers @{ accept = 'application/dns-json' } -TimeoutSec 5
                    $resolvedTunnelAddresses = @($dns.Answer | Where-Object { $_.type -eq 1 } | ForEach-Object { $_.data })
                } catch { $resolvedTunnelAddresses = @() }
            }
            foreach ($resolvedTunnelAddress in $resolvedTunnelAddresses) {
                try {
                    $status = & curl.exe --silent --show-error --connect-timeout 5 --max-time 10 --resolve "${tunnelHost}:443:$resolvedTunnelAddress" --output NUL --write-out '%{http_code}' $url 2>$null
                    if ($LASTEXITCODE -eq 0 -and $status -eq '200') { $ready = $true; break }
                } catch { }
            }
            if ($ready) { break }
            Start-Sleep -Seconds 1
        }
    }
    if (-not $ready) { throw "Demo URL is not reachable yet. See $stderr and $serverLog" }
    Write-Host "`nDEMO LINK: $url" -ForegroundColor Green
    if (-not $NoBrowser) {
        try { Set-Clipboard -Value $url; Write-Host 'Copied to clipboard.' } catch { Write-Host 'Copy the link above manually.' }
        Start-Process $url
    }
    Write-Host 'Uses shared data/production with localhost. Keep this window open; closing it stops public access.'
    Write-Host 'Press Ctrl+C to stop.'
    while (-not $tunnelProcess.HasExited -and -not $serverProcess.HasExited) { Start-Sleep -Seconds 1 }
    throw 'The tunnel or server stopped. Run this file again to get a new link.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (-not $NoBrowser) { Read-Host 'Press Enter to close' }
} finally {
    foreach ($child in @($serverProcess, $tunnelProcess)) {
        if ($null -ne $child -and -not $child.HasExited) { Stop-Process -Id $child.Id -ErrorAction SilentlyContinue }
    }
    foreach ($key in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], 'Process') }
}
