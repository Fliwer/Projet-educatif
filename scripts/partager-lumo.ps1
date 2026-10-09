# Crée un lien temporaire vers une démo fictive, indépendante du jeu local.
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$partage = Join-Path $racine 'data\partage'
$etatPartage = Join-Path $partage 'etat.json'
$tunnel = Join-Path $partage 'outils\cloudflared.exe'
$portPartage = 4322
New-Item -ItemType Directory -Force -Path $partage | Out-Null
if (Test-Path -LiteralPath $etatPartage) {
  $ancien = Get-Content -LiteralPath $etatPartage -Raw | ConvertFrom-Json
  $actif = Get-Process -Id $ancien.tunnel -ErrorAction SilentlyContinue
  $appActive = Get-Process -Id $ancien.serveur -ErrorAction SilentlyContinue
  if ($actif -and $actif.Path -eq $tunnel -and $appActive -and $appActive.ProcessName -eq 'node') {
    Write-Output "Lien déjà actif : $($ancien.url)"
    Write-Output 'Code du jeu : LUMO01'
    exit 0
  }
  throw 'Un ancien partage est enregistré. Lance Arrêter le partage.cmd puis réessaie.'
}
if (-not (Test-Path -LiteralPath $tunnel)) { throw 'Le programme Cloudflare manque dans data\partage\outils.' }
if (Get-NetTCPConnection -LocalPort $portPartage -State Listen -ErrorAction SilentlyContinue) { throw 'Le port 4322 est déjà occupé.' }
$donneesDemo = Join-Path $partage 'demo'
$ancienDossier = $env:LUMO_DATA
$ancienPort = $env:PORT
$ancienModePartage = $env:LUMO_PARTAGE
$ancienMcpActif = $env:LUMO_MCP_ACTIF
$serveur = $null
$connexion = $null
try {
  $env:LUMO_DATA = $donneesDemo
  $env:PORT = "$portPartage"
  $env:LUMO_PARTAGE = '1'
  $env:LUMO_MCP_ACTIF = '1'
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  if (-not (Test-Path -LiteralPath (Join-Path $donneesDemo 'lumo.db'))) {
    & $node (Join-Path $PSScriptRoot 'demo.ts')
    if ($LASTEXITCODE -ne 0) { throw 'Création de la démo impossible.' }
  }
  $serveur = Start-Process -FilePath $node -WorkingDirectory $racine -WindowStyle Hidden -PassThru `
    -ArgumentList 'src/web.ts' -RedirectStandardOutput (Join-Path $partage 'serveur.log') -RedirectStandardError (Join-Path $partage 'serveur-erreurs.log')
  $chrono = [System.Diagnostics.Stopwatch]::StartNew()
  while ($true) {
    try { Invoke-RestMethod "http://127.0.0.1:$portPartage/api/moi" -Headers @{ 'X-Lumo-Code' = 'LUMO01' } -TimeoutSec 1 | Out-Null; break } catch {}
    if ($serveur.HasExited -or $chrono.Elapsed.TotalSeconds -gt 15) { throw 'La démo ne répond pas. Consulte data\partage\serveur-erreurs.log.' }
    Start-Sleep -Milliseconds 150
  }
  $journalTunnel = Join-Path $partage 'tunnel.log'
  $connexion = Start-Process -FilePath $tunnel -WindowStyle Hidden -PassThru `
    -ArgumentList @('tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', "http://127.0.0.1:$portPartage") `
    -RedirectStandardOutput (Join-Path $partage 'tunnel-sortie.log') -RedirectStandardError $journalTunnel
  $chrono.Restart()
  $url = $null
  while ($chrono.Elapsed.TotalSeconds -lt 40) {
    $journal = Get-Content -LiteralPath $journalTunnel -Raw -ErrorAction SilentlyContinue
    if ($journal -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0] }
    if ($url -and $journal -match 'Registered tunnel connection') { break }
    if ($connexion.HasExited) { throw 'Cloudflare ne répond pas. Consulte data\partage\tunnel.log.' }
    Start-Sleep -Milliseconds 250
  }
  if (-not $url -or $journal -notmatch 'Registered tunnel connection') { throw 'La connexion prend trop longtemps. Consulte data\partage\tunnel.log.' }
  @{ url = $url; serveur = $serveur.Id; tunnel = $connexion.Id; node = $node; programmeTunnel = $tunnel } | ConvertTo-Json | Set-Content -LiteralPath $etatPartage -Encoding utf8
  Write-Output "Lien à partager : $url"
  Write-Output 'Code du jeu : LUMO01'
  Write-Output 'Garde ce PC allumé et connecté. Pour couper le lien : Arrêter le partage.cmd.'
} catch {
  if ($connexion -and -not $connexion.HasExited) { Stop-Process -Id $connexion.Id }
  if ($serveur -and -not $serveur.HasExited) { Stop-Process -Id $serveur.Id }
  throw
} finally {
  $env:LUMO_DATA = $ancienDossier
  $env:PORT = $ancienPort
  $env:LUMO_PARTAGE = $ancienModePartage
  $env:LUMO_MCP_ACTIF = $ancienMcpActif
}


