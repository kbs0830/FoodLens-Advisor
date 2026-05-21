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

## Web Client

簡潔的 HTML + CSS + JavaScript 前端，用來連接 FoodLens BFF。

### 快速開始

1. 確保 BFF 已啟動：
```bash
python app/main.py
```

2. 在瀏覽器開啟 `web-client/index.html`（或用本地伺服器）：
```bash
cd web-client
python -m http.server 8000
# 然後打開 http://127.0.0.1:8000
```

3. 點擊「測試 BFF 連線」按鈕

### 功能

- ✅ 連線測試
- ✅ 食物分析
- ✅ 營養統計展示
- ✅ 標準檢查
- ✅ 建議顯示

### 技術

- HTML5
- CSS3（漸層、動畫）
- Vanilla JavaScript（Fetch API）

## Android 客戶端（補充）

此資料夾含可編譯的 Android 最小專案（Kotlin + Compose + Retrofit）。

### 快速啟動

1. 用 Android Studio 開啟 `android-client`。
2. 等待 Gradle Sync 完成。
3. 選擇模擬器或實機後執行 Run。

### 已完成項目

- `MainActivity` + Compose 首頁
- `NetworkModule`（Retrofit + OkHttp）
- `FoodAnalysisViewModel` / `Repository`
- 點擊按鈕可送出測試 Base64 到 BFF `/api/v1/analyze-food`

### BFF 位址設定

- 檔案：`app/src/main/java/com/foodlens/advisor/network/NetworkModule.kt`
- 模擬器建議：`http://10.0.2.2:8080/`
- 實體手機請改成你電腦在同網段的 IP，例如：`http://192.168.1.10:8080/`

### 下一步

- CameraX 拍照與壓縮串接到 `ImageEncoder`
- 將測試 payload 換成實拍圖片 Base64
- AI 真實 provider（OpenAI / Gemini）待後續補上
