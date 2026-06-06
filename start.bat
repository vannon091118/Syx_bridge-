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

:: Check Argos Translate
echo [INFO] Pruefe Argos Translate...
node scripts\check_argos.js

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
echo [INFO] Starte Uebersetzung mit GUI...

:: Browser automatisch öffnen (nach kurzer Verzögerung damit Node hochfahren kann)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

node index.js --gui %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [FEHLER] Das Programm wurde unerwartet beendet.
    pause
) else (
    echo.
    echo [ERFOLG] Vorgang abgeschlossen!
    pause
)
