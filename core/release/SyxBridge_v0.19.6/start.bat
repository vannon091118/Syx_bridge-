@echo off
SETLOCAL EnableExtensions
title Songs of Syx - AI Bridge

echo ========================================
echo   Songs of Syx - AI Translation Bridge
echo ========================================

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo Bitte installiere Node.js von https://nodejs.org/
    pause
    exit /b
)

:: Check for flags
set KILL_OLD=0
for %%a in (%*) do (
    if "%%a"=="--kill" set KILL_OLD=1
)

if %KILL_OLD%==1 (
    echo [INFO] Erzwinge Cleanup alter Instanzen...
    node core\scripts\cleanup_zombies.js
)

:: Silent instance check
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    if %KILL_OLD%==0 (
        echo [WARNUNG] Eine Instanz scheint bereits auf Port 3000 zu laufen.
        echo           Nutze "start.bat --kill" um alte Instanzen zu beenden.
        timeout /t 3 >nul
    )
)

:: Check for node_modules in core
if not exist core\node_modules (
    echo [INFO] Erstmalige Einrichtung: Installiere Abhaengigkeiten...
    echo      (Dies kann beim ersten Mal 1-2 Minuten dauern)
    pushd core
    call npm install --no-audit --no-fund --loglevel error
    popd
    if %ERRORLEVEL% neq 0 (
        echo [FEHLER] Installation der Abhaengigkeiten fehlgeschlagen.
        echo Bitte stelle sicher, dass eine Internetverbindung besteht.
        pause
        exit /b
    )
    echo [OK] Einrichtung abgeschlossen.
)

:: Check Argos Translate
echo [INFO] Pruefe Argos Translate...
node core\scripts\check_argos.js

:: Check for .env file
if not exist .env (
    echo [WARNUNG] Keine .env Datei gefunden. 
    echo Erstelle Standard .env...
    echo GEMINI_KEY=DEIN_API_KEY_HIER > .env
    echo MOD_PATH="C:\Program Files (x86)\Steam\steamapps\workshop\content\1162750" >> .env
    echo OUTPUT_PATH="%APPDATA%\songsofsyx\mods" >> .env
    echo TARGET_LANG=German >> .env
    echo [INFO] Bitte trage deinen API-Key in die .env Datei ein.
)

:: Run the bridge
echo [INFO] Dashboard wird gestartet...

:: Browser leise öffnen (start /b verhindert neues Fenster für den Hilfsbefehl)
start /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Hauptprozess starten (title hilft beim Wiederfinden im Taskmgr)
title Syx-Bridge Backend
node core\index.js --gui %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [FEHLER] Das Programm wurde unerwartet beendet.
    pause
) else (
    echo.
    echo [ERFOLG] Vorgang abgeschlossen!
    pause
)
