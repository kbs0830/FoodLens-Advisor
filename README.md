# FoodLens-Advisor

Thin Client + Cloud Brain 的 Web 飲食分析系統。

## 一鍵啟動

- 直接執行根目錄的 [start-all.bat](start-all.bat)（同時啟動 BFF + Web）
- 只啟動後端可使用 [start-bff.ps1](start-bff.ps1)
- 啟動後可訪問 `http://127.0.0.1:8000`（前端）與 `http://127.0.0.1:8080/health`（後端）

## BFF 快速啟動

1. 進入資料夾：`cd bff-fastapi`
2. 建立環境並安裝：`pip install -r requirements.txt`
3. 啟動：`python app/main.py`

## 測試結果

- 健康檢查：`GET /health`
- 分析 API：`POST /api/v1/analyze-food`、`POST /api/v1/analyze-text`

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

### 新模型（Food Classifier）

前端已加入 TFJS 食物分類模型支援，用於補強 YOLO/COCO-SSD 的辨識豐富度。

請將模型檔案放在：

- `web-client/models/food101/model.json`
- `web-client/models/food101/group1-shard*.bin`

若你使用不同模型，請同步更新 [web-client/yolo-detector.js](web-client/yolo-detector.js) 內的
`FOOD_CLASSIFIER_MODEL_URL` 與 `FOOD101_LABELS`。

