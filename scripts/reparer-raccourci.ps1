# Met l'icône existante du Bureau à jour vers ce dossier du projet.
$racine = Split-Path -Parent $PSScriptRoot
$bureau = [Environment]::GetFolderPath('Desktop')
$chemin = Join-Path $bureau 'Lumo.lnk'
$raccourci = (New-Object -ComObject WScript.Shell).CreateShortcut($chemin)
$raccourci.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$raccourci.Arguments = '"' + (Join-Path $PSScriptRoot 'lancer-lumo.vbs') + '"'
$raccourci.WorkingDirectory = $racine
$raccourci.IconLocation = Join-Path $racine 'public\lumo.ico'
$raccourci.Save()
Write-Output 'Icône Lumo mise à jour vers le dossier actuel.'
