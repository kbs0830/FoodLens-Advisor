# FoodLens-Advisor

Thin Client + Cloud Brain 的 Android 飲食分析系統。

## 一鍵啟動

- 直接執行根目錄的 [start-bff.ps1](start-bff.ps1)
- 或在 VS Code 執行任務 `Start FoodLens BFF`
- 啟動後會自動打開 `http://127.0.0.1:8080/health`

## BFF 快速啟動

1. 進入資料夾：`cd bff-fastapi`
2. 建立環境並安裝：`pip install -r requirements.txt`
3. 啟動：`python app/main.py`

## Android 客戶端

1. 用 Android Studio 開啟 [android-client](android-client)
2. 等 Gradle Sync 完成
3. 按 Run 執行
4. 先按畫面上的「測試 BFF 連線」按鈕

## 測試結果

- 健康檢查：`GET /health`
- 分析 API：`POST /api/v1/analyze-food`
