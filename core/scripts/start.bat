@echo off
SETLOCAL EnableExtensions
title Songs of Syx - AI Bridge

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\.."

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

:: Check for .env file
if not exist .env (
    echo [WARNUNG] Keine .env Datei gefunden. 
    if exist .env.example (
        echo Erstelle .env aus .env.example...
        copy /Y .env.example .env >nul
    ) else (
        echo Erstelle minimale Standard-.env...
        echo PRIMARY_PROVIDER="openrouter" > .env
        echo PRIMARY_MODEL="openrouter/free" >> .env
        echo OPENROUTER_KEY="" >> .env
        echo GROQ_KEY="" >> .env
        echo GEMINI_KEY="" >> .env
        echo AUDITOR_PROVIDER="ollama" >> .env
        echo AUDITOR_MODEL="" >> .env
        echo POLISHER_PROVIDER="openrouter" >> .env
        echo POLISHER_MODEL="openrouter/free" >> .env
        echo TARGET_LANG="German" >> .env
        echo NATIVE_MODE="false" >> .env
        echo GRAMMAR_CHECK="true" >> .env
    )
    echo [INFO] Bitte trage deine Konfiguration in die .env Datei ein.
)

set "GUI_MODE=true"
for %%A in (%*) do (
    if /I "%%~A"=="--cli" set "GUI_MODE=false"
)

if /I "%GUI_MODE%"=="true" (
    echo [INFO] Starte GUI-Backend im Hintergrund...
    start "syx-bridge-backend" /B node index.js --gui
    timeout /t 2 /nobreak >nul
    echo [INFO] Oeffne Dashboard im Browser...
    start "" http://localhost:3000
    echo [INFO] Das Backend beendet sich automatisch, sobald das Browserfenster geschlossen ist.
    popd
    exit /b 0
)

:: Run the CLI bridge
echo [INFO] Starte Uebersetzung...
node index.js %*
set "APP_EXIT=%ERRORLEVEL%"

if %APP_EXIT% neq 0 (
    echo.
    echo [FEHLER] Das Programm wurde unerwartet beendet.
    pause
) else (
    echo.
    echo [ERFOLG] Vorgang abgeschlossen!
    pause
)

popd
exit /b %APP_EXIT%
