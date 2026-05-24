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
rem     skip WindowsApps stub which is not the real Python interpreter
set "PY_EXE="
if exist "%BFF_DIR%\.venv\Scripts\python.exe" (
    set "PY_EXE=%BFF_DIR%\.venv\Scripts\python.exe"
) else (
    if exist "%ROOT%\.venv\Scripts\python.exe" (
        set "PY_EXE=%ROOT%\.venv\Scripts\python.exe"
    ) else (
        for /f "usebackq tokens=*" %%P in (`where python 2^>nul`) do (
            echo %%P | findstr /i "WindowsApps" >nul 2>&1
            if !ERRORLEVEL! NEQ 0 (
                if not defined PY_EXE set "PY_EXE=%%P"
            )
        )
    )
)

if not defined PY_EXE (
    echo [ERROR] Python is not available on PATH and no venv found.
    pause
    exit /b 1
)

rem --- Check and free port 8080 (BFF) ---
echo [1/4] Checking port 8080 for BFF...
set "PID8080="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do set "PID8080=%%a"
if defined PID8080 (
    echo [WARN] Port 8080 in use by PID %PID8080%. Terminating... See %LOG_DIR%\bff_stop.log
    taskkill /PID %PID8080% /F > "%LOG_DIR%\bff_stop.log" 2>&1 || echo [WARN] taskkill failed >> "%LOG_DIR%\bff_stop.log"
    timeout /t 1 /nobreak >nul
)

rem --- Check and free port 8000 (web server) ---
echo [2/4] Checking port 8000 for web server...
set "PID8000="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do set "PID8000=%%a"
if defined PID8000 (
    echo [WARN] Port 8000 in use by PID %PID8000%. Terminating... See %LOG_DIR%\web_stop.log
    taskkill /PID %PID8000% /F > "%LOG_DIR%\web_stop.log" 2>&1 || echo [WARN] taskkill failed >> "%LOG_DIR%\web_stop.log"
    timeout /t 1 /nobreak >nul
)

echo [3/4] Starting BFF (uvicorn) and web server...
start "FoodLens BFF" cmd /k "cd /d ""%BFF_DIR%"" && ""%PY_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8080 > ""%LOG_DIR%\bff.log"" 2>&1"
start "FoodLens Web" cmd /k "cd /d ""%WEB_CLIENT%"" && ""%PY_EXE%"" -m http.server 8000 --bind 127.0.0.1 > ""%LOG_DIR%\web.log"" 2>&1"

rem --- Wait for BFF to be ready (up to 20 seconds) ---
echo [4/4] Waiting for both servers to start (up to 20s)...
set "WAIT_COUNT=0"
:wait_bff
if !WAIT_COUNT! GEQ 20 (
    echo [WARN] Servers did not respond after 20s, opening browser anyway...
    goto :open_browser
)
powershell -Command "try{$r=(Invoke-WebRequest -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 1 -UseBasicParsing).StatusCode;if($r -eq 200){exit 0}else{exit 1}}catch{exit 1}" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    timeout /t 1 /nobreak >nul
    set /a WAIT_COUNT+=1
    goto :wait_bff
)
rem BFF ready, now wait for web server to serve HTTP
set "WEB_COUNT=0"
:wait_web
if !WEB_COUNT! GEQ 15 (
    echo [WARN] Web server not responding after 15s, opening browser anyway...
    goto :open_browser
)
powershell -Command "try{$r=(Invoke-WebRequest -Uri 'http://127.0.0.1:8000' -TimeoutSec 1 -UseBasicParsing).StatusCode;if($r -ge 200){exit 0}else{exit 1}}catch{exit 1}" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    timeout /t 1 /nobreak >nul
    set /a WEB_COUNT+=1
    goto :wait_web
)
echo [OK] Both servers are ready!

:open_browser
powershell -Command "Start-Process 'http://127.0.0.1:8000'"

echo.
echo Frontend : http://127.0.0.1:8000
echo Backend  : http://127.0.0.1:8080
echo BFF Log  : %LOG_DIR%\bff.log
echo Web Log  : %LOG_DIR%\web.log
echo.
echo 如果瀏覽器顯示錯誤，請關閉舊分頁後按 F5 重新整理。
echo Launcher finished.

endlocal
