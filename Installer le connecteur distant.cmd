@echo off
echo Ferme completement Claude Desktop avant de lancer cette installation.
echo Le connecteur local sera remplace par le connecteur de demonstration distant.
node "%~dp0scripts\installer-connecteur.mjs" "%~dp0data\partage\demo\connexions\demo-distance\.env"
pause
