# Arrête le serveur de l'app Lumo (celui qui écoute sur le port 4321).
$connexion = Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connexion) {
  $racineLumo = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
  $processusLumo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connexion.OwningProcess)"
  # Un port seul ne prouve pas que le processus est notre application.
  $cheminScriptLumo = Join-Path $racineLumo 'src\web.ts'
  if ($processusLumo.Name -ne 'node.exe' -or $processusLumo.CommandLine -notlike "*$cheminScriptLumo*") {
    throw 'Le port 4321 est occupé par un processus dont le chemin Lumo ne peut pas être confirmé. Aucun arrêt effectué.'
  }
  Stop-Process -Id $connexion.OwningProcess -Force
  Write-Host "Lumo est arrêté."
} else {
  Write-Host "Lumo ne tournait pas."
}
