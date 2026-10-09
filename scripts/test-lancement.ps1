# Vérifie le lanceur Windows sur un port et une base temporaires.
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$portTest = 44321
if (Get-NetTCPConnection -LocalPort $portTest -State Listen -ErrorAction SilentlyContinue) { throw 'Le port de test est déjà occupé.' }
$dossierTest = Join-Path $racine ('test-lancement-' + [guid]::NewGuid())
$ancienDossier = $env:LUMO_DATA
$processusTest = $null
try {
  $env:LUMO_DATA = $dossierTest
  $chrono = [System.Diagnostics.Stopwatch]::StartNew()
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'lancer-lumo.ps1') -SansNavigateur -Port $portTest
  if ($LASTEXITCODE -ne 0) { throw 'Le premier lancement a échoué.' }
  $premier = $chrono.Elapsed.TotalSeconds
  $processusTest = (Get-NetTCPConnection -LocalPort $portTest -State Listen).OwningProcess | Select-Object -First 1
  $chrono.Restart()
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'lancer-lumo.ps1') -SansNavigateur -Port $portTest
  if ($LASTEXITCODE -ne 0) { throw 'Le deuxième lancement a échoué.' }
  $second = $chrono.Elapsed.TotalSeconds
  $processusSecond = (Get-NetTCPConnection -LocalPort $portTest -State Listen).OwningProcess | Select-Object -First 1
  if ($processusTest -ne $processusSecond) { throw 'Un deuxième serveur a été lancé.' }
  $suivi = Invoke-RestMethod "http://127.0.0.1:$portTest/api/suivi-voix" -NoProxy
  if ($suivi.appels -ne 0) { throw 'Le suivi a généré un appel inattendu.' }
  $page = Invoke-WebRequest "http://127.0.0.1:$portTest/suivi-voix.html" -NoProxy
  if (-not $page.Content.Contains('Suivi de la voix de Milo')) { throw 'La page de suivi manque.' }
  Write-Output ('OK : démarrage {0:N2} s ; deuxième lancement {1:N2} s ; même serveur ; suivi sans appel externe.' -f $premier, $second)
} finally {
  if (-not $processusTest) {
    $processusTest = (Get-NetTCPConnection -LocalPort $portTest -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
  }
  if ($processusTest) { Stop-Process -Id $processusTest -ErrorAction SilentlyContinue }
  $env:LUMO_DATA = $ancienDossier
  # La cible résolue doit être un sous-dossier temporaire de ce projet.
  $cible = [System.IO.Path]::GetFullPath($dossierTest)
  $prefixe = [System.IO.Path]::GetFullPath($racine).TrimEnd('\') + '\test-lancement-'
  if ($cible.StartsWith($prefixe, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $cible)) {
    Remove-Item -LiteralPath $cible -Recurse -Force
  }
}
