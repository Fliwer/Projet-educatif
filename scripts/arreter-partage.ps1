# Coupe uniquement les processus du partage, en vérifiant leur identité.
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$etatPartage = Join-Path $racine 'data\partage\etat.json'
if (-not (Test-Path -LiteralPath $etatPartage)) { Write-Output 'Aucun partage actif.'; exit 0 }
$etat = Get-Content -LiteralPath $etatPartage -Raw | ConvertFrom-Json
foreach ($element in @(@{ id = $etat.tunnel; chemin = $etat.programmeTunnel }, @{ id = $etat.serveur; chemin = $etat.node })) {
  $processus = Get-Process -Id $element.id -ErrorAction SilentlyContinue
  if ($processus -and $processus.Path -eq $element.chemin) {
    $commande = (Get-CimInstance Win32_Process -Filter "ProcessId = $($element.id)").CommandLine
    if ($element.id -eq $etat.serveur -and $commande -notmatch 'src[\\/]web\.ts') { throw 'Le processus enregistré a changé : arrêt annulé.' }
    Stop-Process -Id $element.id
  }
}
Remove-Item -LiteralPath $etatPartage
Write-Output 'Le lien de partage est coupé. Le jeu local reste disponible.'
