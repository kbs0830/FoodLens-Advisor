# 🍽️ FoodLens Advisor

> AI 驅動的食物辨識與飲食分析系統 — 上傳一張照片，立即獲得熱量估算、三大營養素分析與個人化飲食建議。

---

## 專案介紹

FoodLens Advisor 是一套「**瀏覽器端辨識 + 雲端 AI 分析**」的輕量飲食助手：

1. **前端 YOLO 辨識**：圖片在瀏覽器本地執行 ONNX Runtime，偵測食物種類（中亞料理 46 類）
2. **COCO-SSD 備援**：若 ONNX 未偵測到食物，自動切換 TensorFlow.js COCO-SSD（漢堡、披薩、香蕉等通用食物）
3. **Gemini AI 分析**：偵測到的食物標籤（文字）送到 FastAPI 後端，呼叫 Google Gemini 2.5 Flash 分析
4. **即時回傳**：熱量（kcal）、蛋白質/碳水/脂肪（g）、飲食評估、下一餐建議、營養提示、飲食警告

---

## 使用技術

| 層次 | 技術 |
|------|------|
| 前端框架 | 純 HTML5 + CSS3 + Vanilla JS（無框架） |
| 食物辨識 | ONNX Runtime Web（YOLOv8 ONNX，46 類中亞料理） |
| 備援辨識 | TensorFlow.js + COCO-SSD（80 類通用物件） |
| 後端框架 | FastAPI（Python 3.13） |
| AI 模型  | Google Gemini 2.5 Flash Lite（`models/gemini-2.5-flash-lite`） |
| 資料驗證 | Pydantic v2 |
| 啟動腳本 | Windows Batch + PowerShell |

---

## 系統架構

```
使用者上傳圖片
     │
     ▼
[瀏覽器] yolo-detector.js
  ├─ ONNX Runtime Web (YOLOv8, 46類)
  └─ 備援: TensorFlow.js COCO-SSD
  → 輸出 food_items[], confidence_scores[]
     │
     ▼
[瀏覽器] script.js
  POST /api/v1/analyze-text
  { food_items, description, locale, detection_meta }
     │
     ▼
[FastAPI BFF :8080] vision_service.py
  呼叫 Gemini 2.5 Flash Lite
  → 回傳 AnalyzeFoodResponse
  (熱量、三大營養素、飲食評估、建議、提示、警告)
     │
     ▼
[瀏覽器] displayResult()
  顯示完整分析結果卡片
```

---

## 快速開始

### Windows 一鍵啟動（推薦）

```bat
start-all.bat
```

會自動：偵測 Python 路徑 → 清除占用的 port → 啟動 BFF + Web 伺服器 → 開啟瀏覽器

### 手動啟動

```bash
# 後端 BFF（port 8080）
cd bff-fastapi
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080

# 前端（port 8000，另開終端機）
cd web-client
python -m http.server 8000 --bind 127.0.0.1
# 開啟 http://127.0.0.1:8000
```

---

## 環境設定

在 `bff-fastapi/` 建立 `.env`（參考 `.env.example`）：

```env
VISION_PROVIDER=gemini
GEMINI_API_KEY=你的_Gemini_API_金鑰
GEMINI_TEXT_MODEL=models/gemini-2.5-flash-lite
GEMINI_VISION_MODEL=models/gemini-2.5-flash-lite
YOLO_WEIGHTS_PATH=weights/milliy-taomlar-detector-best.pt
YOLO_CONF_THRESHOLD=0.18
```

> **注意**：`.env` 已加入 `.gitignore`，請勿將金鑰提交至版本控制。

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET  | `/health` | 健康檢查 |
| POST | `/api/v1/analyze-text` | **主要端點**：YOLO 偵測文字 → Gemini 分析 |
| POST | `/api/v1/detect-food` | 後端 YOLO 偵測（圖片 base64） |
| POST | `/api/v1/analyze-food` | Gemini Vision 圖片分析（相容舊版） |
| POST | `/api/v1/classify-food` | ResNet50 食物分類（備用） |

---

## 專案結構

```
FoodLens-Advisor/
├── bff-fastapi/                  # FastAPI 後端
│   ├── app/
│   │   ├── main.py               # 路由定義
│   │   ├── schemas.py            # Pydantic 請求/回應模型
│   │   └── services/
│   │       ├── vision_service.py # Gemini AI 分析核心
│   │       ├── detection_service.py # 後端 YOLO 偵測
│   │       └── food_classifier.py   # ResNet50 備用分類
│   ├── weights/                  # YOLOv8 模型權重
│   ├── .env.example              # 環境變數範本
│   └── requirements.txt
│
├── web-client/                   # 純前端
│   ├── index.html                # 頁面入口
│   ├── style.css                 # 現代化 UI 樣式
│   ├── script.js                 # UI 邏輯、API 串接
│   ├── yolo-detector.js          # ONNX/COCO-SSD 食物辨識
│   └── models/food/              # 前端 ONNX 模型（43MB）
│
├── docs/                         # 專案文件
│   └── PROJECT_REPORT.md         # 期末報告
│
├── start-all.bat                 # Windows 一鍵啟動
└── start-bff.ps1                 # 單獨啟動 BFF
```

---

## 注意事項

- **模型覆蓋範圍**：ONNX 模型為中亞料理（手抓飯、烤肉串等 46 類），一般食物（漢堡、披薩等）由 COCO-SSD 備援偵測
- **Python 路徑**：Windows 請使用 `Programs\Python313\python.exe`，非 Microsoft Store stub
- **CORS**：後端已設 `allow_origins=["*"]`，上線部署需限縮為實際網域
