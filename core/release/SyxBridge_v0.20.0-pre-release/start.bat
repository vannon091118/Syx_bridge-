@echo off
SETLOCAL EnableExtensions EnableDelayedExpansion
title Songs of Syx - AI Bridge

echo ========================================
echo   Songs of Syx - AI Translation Bridge
echo ========================================

:: Ensure we run from the script's own directory (fixes System32 CWD when launched from Explorer)
cd /d "%~dp0"

:: ─── Node.js check ─────────────────────────────────────────────────
where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo Bitte installiere Node.js von https://nodejs.org/
    pause
    exit /b 1
)

:: ─── Parse flags ────────────────────────────────────────────────────
set "KILL_OLD=0"
set "GUI_MODE=true"
set "APP_ARGS=%*"
for %%A in (%*) do (
    if /I "%%~A"=="--kill" (
        set "KILL_OLD=1"
        set "APP_ARGS=!APP_ARGS:--kill=!"
    )
    if /I "%%~A"=="--cli" (
        set "GUI_MODE=false"
        set "APP_ARGS=!APP_ARGS:--cli=!"
    )
)

:: ─── Zombie cleanup (explicit --kill) ───────────────────────────────
if !KILL_OLD!==1 (
    echo [INFO] Erzwinge Cleanup alter Instanzen...
    node core\scripts\cleanup_zombies.js
)

:: ─── Port 3000 instance check ──────────────────────────────────────
:: KILL old backend process to prevent connecting to outdated code.
:: The backend runs independently from this CMD window (start /B), so
:: a previous instance can survive across multiple start.bat runs.
netstat -ano | findstr :3000 | findstr LISTENING >nul
if !ERRORLEVEL! equ 0 (
    echo [INFO] Alte Instanz auf Port 3000 gefunden. Beende...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        taskkill /F /PID %%p >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
)

:: ─── npm install (first run) ────────────────────────────────────────
if not exist core\node_modules (
    echo [INFO] Erstmalige Einrichtung: Installiere Abhaengigkeiten...
    echo      Dies kann beim ersten Mal 1-2 Minuten dauern.
    pushd core
    call npm install --no-audit --no-fund --loglevel error
    set "NPM_RC=!ERRORLEVEL!"
    popd
    if !NPM_RC! neq 0 (
        echo [FEHLER] Installation der Abhaengigkeiten fehlgeschlagen.
        echo Bitte stelle sicher, dass eine Internetverbindung besteht.
        pause
        exit /b 1
    )
    echo [OK] Einrichtung abgeschlossen.
)

:: ─── .env file (create if missing) ─────────────────────────────────
if not exist core\.env (
    echo [WARNUNG] Keine .env Datei gefunden.
    if exist core\.env.example (
        echo Erstelle core\.env aus core\.env.example...
        copy /Y core\.env.example core\.env >nul
    ) else (
        echo Erstelle Standard-Konfiguration...
        echo PRIMARY_PROVIDER="openrouter" > core\.env
        echo PRIMARY_MODEL="openrouter/free" >> core\.env
        echo OPENROUTER_KEY="" >> core\.env
        echo GROQ_KEY="" >> core\.env
        echo GEMINI_KEY="" >> core\.env
        echo AUDITOR_PROVIDER="openrouter" >> core\.env
        echo POLISHER_PROVIDER="openrouter" >> core\.env
        echo POLISHER_MODEL="openrouter/free" >> core\.env
        echo TARGET_LANG="German" >> core\.env
        echo NATIVE_MODE="true" >> core\.env
        echo GRAMMAR_CHECK="true" >> core\.env
        echo MOD_PATH="C:\Program Files ^(x86^)\Steam\steamapps\workshop\content\1162750" >> core\.env
        echo OUTPUT_PATH="%APPDATA%\songsofsyx\mods" >> core\.env
    )
    echo [INFO] Bitte trage deine Konfiguration in core\.env ein.
)

:: ─── NMT Local Provider (REMOVED — BU-040) ─────────────────
:: NMT_LOCAL_ENABLED was removed from the application (config-runtime.js,
:: index.js). Auto-install and warm-model blocks removed to prevent silent
:: 1.2 GB package installs. warm-model.js retained as Roadmap v0.23.

:: ─── Start application ──────────────────────────────────────────────
if /I "!GUI_MODE!"=="true" (
    echo [INFO] Starte Backend...
    pushd core
    start "syx-bridge-backend" /B node index.js --gui
    popd
    timeout /t 3 /nobreak >nul
    start "" http://localhost:3000
    echo [INFO] Dashboard geoeffnet. Das Backend laeuft im Hintergrund.
    echo [INFO] Schliesse das Browserfenster oder druecke Strg+C zum Beenden.
    pause >nul
    exit /b 0
)

:: CLI mode
echo [INFO] Starte Uebersetzung...
pushd core
node index.js !APP_ARGS!
set "APP_EXIT=!ERRORLEVEL!"
popd

if !APP_EXIT! neq 0 (
    echo.
    echo [FEHLER] Das Programm wurde unerwartet beendet.
    pause
) else (
    echo.
    echo [ERFOLG] Vorgang abgeschlossen!
    pause
)
exit /b !APP_EXIT!
