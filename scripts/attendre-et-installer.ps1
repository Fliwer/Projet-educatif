# Attend que Claude Desktop soit complètement fermé, puis installe le connecteur Lumo.
# Abandonne après 30 minutes. Écrit ce qu'il fait dans data\installation-connecteur.log.
$racine = Split-Path -Parent $PSScriptRoot
$journal = Join-Path $racine "data\installation-connecteur.log"
"$(Get-Date -Format HH:mm:ss) En attente de la fermeture de Claude Desktop..." | Out-File $journal -Encoding utf8
$fin = (Get-Date).AddMinutes(30)
while ((Get-Date) -lt $fin) {
  if (-not (Get-Process -Name "claude" -ErrorAction SilentlyContinue)) {
    Start-Sleep -Seconds 2
    & "C:\Program Files\nodejs\node.exe" (Join-Path $racine "scripts\installer-connecteur.mjs") 2>&1 | Out-File $journal -Append -Encoding utf8
    "$(Get-Date -Format HH:mm:ss) Terminé." | Out-File $journal -Append -Encoding utf8
    exit 0
  }
  Start-Sleep -Seconds 2
}
"$(Get-Date -Format HH:mm:ss) Abandon : Claude Desktop n'a pas été fermé en 30 minutes." | Out-File $journal -Append -Encoding utf8
