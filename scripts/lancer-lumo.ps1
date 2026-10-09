# Lance Lumo en arrière-plan, puis ouvre le navigateur.
param([switch]$SansNavigateur, [int]$Port = 4321)
$racine = Split-Path -Parent $PSScriptRoot
$adresse = "http://localhost:$Port"
$sonde = "http://127.0.0.1:$Port/manifest.webmanifest"
function EnMarche {
  # IPv4 et aucun proxy : pas d'attente liée à la résolution de localhost.
  $requete = [System.Net.HttpWebRequest]::Create($sonde)
  $requete.Proxy = $null
  $requete.Timeout = 300
  $requete.ReadWriteTimeout = 300
  try {
    $reponse = $requete.GetResponse()
    $reponse.Close()
    return $true
  } catch { return $false }
}
$verrou = New-Object System.Threading.Mutex($false, "Local\Lumo-Lancement-$Port")
$acquis = $false
try {
  try { $acquis = $verrou.WaitOne(15000) }
  catch [System.Threading.AbandonedMutexException] { $acquis = $true }
  if (-not $acquis) { throw "Un lancement est déjà en cours. Réessaie dans quelques secondes." }
  if (-not (EnMarche)) {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $donnees = if ($env:LUMO_DATA) { $env:LUMO_DATA } else { Join-Path $racine "data" }
    New-Item -ItemType Directory -Force $donnees | Out-Null
    $ancienPort = $env:PORT
    try {
      $env:PORT = "$Port"
      $serveur = Start-Process -FilePath $node -WorkingDirectory $racine -WindowStyle Hidden -PassThru `
        -ArgumentList ('"' + (Join-Path $racine 'src\web.ts') + '"') `
        -RedirectStandardOutput (Join-Path $donnees "serveur.log") `
        -RedirectStandardError (Join-Path $donnees "serveur-erreurs.log")
    } finally { $env:PORT = $ancienPort }
    $attente = [System.Diagnostics.Stopwatch]::StartNew()
    while (-not (EnMarche)) {
      if ($serveur.HasExited) { throw "Le serveur s'est arrêté. Consulte data\serveur-erreurs.log." }
      if ($attente.Elapsed.TotalSeconds -ge 12) { throw "Le serveur ne répond pas encore. Consulte data\serveur-erreurs.log, puis réessaie." }
      Start-Sleep -Milliseconds 100
    }
  }
  if (-not $SansNavigateur) { Start-Process $adresse }
} catch {
  if ($SansNavigateur) { throw }
  $fenetre = New-Object -ComObject WScript.Shell
  $fenetre.Popup($_.Exception.Message, 0, "Lumo", 48) | Out-Null
  exit 1
} finally {
  if ($acquis) { $verrou.ReleaseMutex() }
  $verrou.Dispose()
}
