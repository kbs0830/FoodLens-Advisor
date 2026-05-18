android app$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$bffMain = Join-Path $root "bff-fastapi\app\main.py"
$bffWorkingDir = Join-Path $root "bff-fastapi"
$healthUrl = "http://127.0.0.1:8080/health"

if (-not (Test-Path $venvPython)) {
    Write-Error "找不到 Python 執行檔：$venvPython"
    exit 1
}

if (-not (Test-Path $bffMain)) {
    Write-Error "找不到 BFF 入口檔：$bffMain"
    exit 1
}

Start-Process -FilePath $venvPython -ArgumentList @($bffMain) -WorkingDirectory $bffWorkingDir

for ($i = 0; $i -lt 20; $i++) {
    try {
        Invoke-RestMethod $healthUrl | Out-Null
        Start-Process $healthUrl
        Write-Host "BFF 已啟動並開啟健康檢查頁面。"
        exit 0
    } catch {
        Start-Sleep -Seconds 1
    }
}

Write-Warning "BFF 已啟動，但健康檢查頁面尚未就緒，請稍後手動開啟 $healthUrl"

