@echo off
chcp 65001 >nul
title Lumo - installer le connecteur Claude
echo.
echo  Lumo : installation du connecteur dans Claude Desktop
echo  -----------------------------------------------------
echo.
:verifier
tasklist /FI "IMAGENAME eq claude.exe" 2>nul | find /I "claude.exe" >nul
if %errorlevel%==0 (
  echo  Claude Desktop est encore ouvert.
  echo  Quitte-le completement : clic droit sur l'icone Claude pres de l'horloge, puis "Quitter".
  echo.
  pause
  goto verifier
)
node "%~dp0scripts\installer-connecteur.mjs"
echo.
pause
