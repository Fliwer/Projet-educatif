' Lance scripts\lancer-lumo.ps1 sans afficher de fenêtre noire (utilisé par l'icône du Bureau).
Dim dossier, commande
dossier = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
commande = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dossier & "\lancer-lumo.ps1"""
If WScript.Arguments.Count > 0 Then commande = commande & " " & WScript.Arguments(0)
CreateObject("WScript.Shell").Run commande, 0, False
