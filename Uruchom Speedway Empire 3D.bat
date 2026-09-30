@echo off
rem Speedway Empire 3D - uruchomienie na Windows (dwuklik)
rem Startuje lokalny serwer (PowerShell, bez instalacji) i otwiera gre w osobnym oknie.
cd /d "%~dp0"
start "Speedway Empire 3D - serwer" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serwer.ps1" -Port 5180
timeout /t 2 /nobreak >nul
rem Okno bez paska adresu (tryb aplikacji Edge); jesli Edge nie ma - domyslna przegladarka
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://localhost:5180/ --start-maximized
) else (
  start "" http://localhost:5180/
)
