@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "WEB_CLIENT=%ROOT%web-client"
set "BFF_DIR=%ROOT%bff-fastapi"

rem Ensure console uses UTF-8 to avoid garbled logs on Windows
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

cls
echo ==============================================
echo   FoodLens-Advisor launcher
echo ==============================================
echo.


if not exist "%WEB_CLIENT%\index.html" (
    echo [ERROR] Cannot find web client: %WEB_CLIENT%
    pause
    exit /b 1
)

if not exist "%BFF_DIR%\app\main.py" (
    echo [ERROR] Cannot find BFF entry: %BFF_DIR%\app\main.py
    pause
    exit /b 1
)

set "LOG_DIR=%ROOT%logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "WEB_INDEX=%WEB_CLIENT%\index.html"

rem --- find python executable (prefer venv inside BFF, then repo venv, then system)
set "PY_EXE="
if exist "%BFF_DIR%\.venv\Scripts\python.exe" (
    set "PY_EXE=%BFF_DIR%\.venv\Scripts\python.exe"
) else (
    if exist "%ROOT%\.venv\Scripts\python.exe" (
        set "PY_EXE=%ROOT%\.venv\Scripts\python.exe"
    ) else (
        for /f "usebackq tokens=*" %%P in (`where python 2^>nul`) do (
            set "PY_EXE=%%P"
        )
    )
)

if not defined PY_EXE (
    echo [ERROR] Python is not available on PATH and no venv found.
    pause
    exit /b 1
)

rem --- Start BFF: check port 8080 and free if necessary
echo [1/3] Checking port 8080 for BFF...
set "PID8080="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do set "PID8080=%%a"
if defined PID8080 (
    echo [WARN] Port 8080 in use by PID %PID8080%. Attempting to terminate... See %LOG_DIR%\bff_stop.log
    taskkill /PID %PID8080% /F > "%LOG_DIR%\bff_stop.log" 2>&1 || echo [WARN] taskkill failed >> "%LOG_DIR%\bff_stop.log"
    timeout /t 1 /nobreak >nul
)

echo [1/3] Starting BFF (uvicorn) using %PY_EXE%...
start "FoodLens BFF" cmd /k "cd /d ""%BFF_DIR%"" && ""%PY_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8080 > ""%LOG_DIR%\bff.log"" 2>&1"
:open_browser
echo [3/3] Opening browser...
start "" "%WEB_INDEX%"

echo.
echo Frontend: %WEB_INDEX%
echo Backend : http://127.0.0.1:8080
echo Logs    : %LOG_DIR%
echo.
echo Launcher finished.

endlocal
